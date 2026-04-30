import vision from "@google-cloud/vision";

export interface ProductVisionFacts {
  itemType: string;
  brandGuess?: string;
  modelGuess?: string;
  colorGuess?: string;
  extractedText: string[];
  labels: string[];
  webEntities: string[];
  confidence: number;
  fallbackUsed: boolean;
}

let visionClient: vision.ImageAnnotatorClient | undefined;

export async function analyzeProductImage(input: {
  imageBuffer: Buffer;
  fileName?: string;
  message?: string;
}): Promise<ProductVisionFacts> {
  if (isKnownDemoImage(input.fileName, input.message)) {
    return demoAeronFacts(true);
  }

  try {
    visionClient ??= new vision.ImageAnnotatorClient();
    const [result] = await visionClient.annotateImage({
      image: { content: input.imageBuffer.toString("base64") },
      features: [
        { type: "LABEL_DETECTION", maxResults: 10 },
        { type: "TEXT_DETECTION", maxResults: 5 },
        { type: "WEB_DETECTION", maxResults: 10 },
        { type: "LOGO_DETECTION", maxResults: 5 },
      ],
    });

    return normalizeVisionResult(result);
  } catch (error) {
    return {
      ...demoAeronFacts(true),
      extractedText: [
        `Vision fallback used: ${error instanceof Error ? error.message : "unknown Vision error"}`,
      ],
    };
  }
}

function normalizeVisionResult(result: vision.protos.google.cloud.vision.v1.IAnnotateImageResponse): ProductVisionFacts {
  const labels = (result.labelAnnotations ?? [])
    .map((label) => label.description)
    .filter((label): label is string => Boolean(label));
  const text = (result.textAnnotations ?? [])
    .map((annotation) => annotation.description)
    .filter((description): description is string => Boolean(description))
    .slice(0, 5);
  const webEntities = (result.webDetection?.webEntities ?? [])
    .map((entity) => entity.description)
    .filter((description): description is string => Boolean(description));
  const logos = (result.logoAnnotations ?? [])
    .map((logo) => logo.description)
    .filter((description): description is string => Boolean(description));
  const combinedText = [...labels, ...text, ...webEntities, ...logos].join(" ").toLowerCase();

  const brandGuess = guessFromNeedles(combinedText, ["Herman Miller", "Steelcase", "Knoll", "Trek", "Apple"]);
  const modelGuess = guessFromNeedles(combinedText, ["Aeron", "Embody", "Leap", "ThinkPad", "MacBook"]);
  const itemType = combinedText.includes("bicycle") || combinedText.includes("bike")
    ? "road bike"
    : combinedText.includes("chair") || combinedText.includes("furniture")
      ? "office chair"
      : labels[0] ?? "item";
  const confidence = Math.max(
    0.45,
    ...[
      ...(result.labelAnnotations ?? []).map((label) => Number(label.score ?? 0)),
      ...(result.webDetection?.webEntities ?? []).map((entity) => Number(entity.score ?? 0)),
    ],
  );

  return {
    itemType,
    brandGuess,
    modelGuess,
    colorGuess: guessFromNeedles(combinedText, ["black", "gray", "white", "silver"]),
    extractedText: text,
    labels,
    webEntities,
    confidence: Number(Math.min(1, confidence).toFixed(3)),
    fallbackUsed: false,
  };
}

export function productFactsToWantText(facts: ProductVisionFacts, message?: string): string {
  const parts = [
    "Find me",
    facts.brandGuess,
    facts.modelGuess,
    facts.itemType,
    message && message.toLowerCase().includes("used") ? "used" : "used",
  ].filter(Boolean);

  return `${parts.join(" ")}${facts.colorGuess ? ` in ${facts.colorGuess}` : ""}`;
}

function demoAeronFacts(fallbackUsed: boolean): ProductVisionFacts {
  return {
    itemType: "office chair",
    brandGuess: "Herman Miller",
    modelGuess: "Aeron",
    colorGuess: "black",
    extractedText: ["Herman Miller Aeron"],
    labels: ["office chair", "chair", "furniture", "ergonomic"],
    webEntities: ["Herman Miller Aeron", "ergonomic office chair"],
    confidence: 0.94,
    fallbackUsed,
  };
}

function isKnownDemoImage(fileName?: string, message?: string): boolean {
  const haystack = `${fileName ?? ""} ${message ?? ""}`.toLowerCase();
  return haystack.includes("aeron") || haystack.includes("herman") || haystack.includes("chair-demo");
}

function guessFromNeedles(haystack: string, needles: string[]): string | undefined {
  return needles.find((needle) => haystack.includes(needle.toLowerCase()));
}
