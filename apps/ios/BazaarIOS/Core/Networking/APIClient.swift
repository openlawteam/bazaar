import Foundation

struct HealthResponse: Decodable {
    let ok: Bool
    let service: String
    let agentRoles: [String]
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    func fetchHealth() async throws -> HealthResponse {
        let url = AppConfig.baseURL.appendingPathComponent("health")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard
            let http = response as? HTTPURLResponse,
            (200..<300).contains(http.statusCode)
        else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(HealthResponse.self, from: data)
    }
}
