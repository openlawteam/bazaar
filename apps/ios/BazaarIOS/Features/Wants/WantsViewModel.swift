import Foundation
import Combine

struct MockWant: Identifiable {
    let id: String
    let title: String
    let status: String
    let location: String
    let budgetText: String
}

@MainActor
final class WantsViewModel: ObservableObject {
    @Published var wants: [MockWant] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var healthLabel = "API: not checked"

    func loadWants() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        // Placeholder until persistence endpoints are ready.
        try? await Task.sleep(nanoseconds: 400_000_000)
        wants = [
            MockWant(
                id: "want_1",
                title: "Used road bike under $500",
                status: "Searching",
                location: "Brooklyn, NY",
                budgetText: "$500"
            ),
            MockWant(
                id: "want_2",
                title: "Standing desk 55 inch",
                status: "Awaiting Approval",
                location: "NYC Metro",
                budgetText: "$350"
            ),
            MockWant(
                id: "want_3",
                title: "Refurb iPad mini",
                status: "Intake",
                location: "Shipping OK",
                budgetText: "$450"
            )
        ]
    }

    func refreshHealth() async {
        do {
            let health = try await APIClient.shared.fetchHealth()
            healthLabel = "API: \(health.service): \(health.ok ? "ok" : "not ok")"
        } catch {
            healthLabel = "API: unavailable"
        }
    }
}
