import SwiftUI

struct WantsHomeView: View {
    @State private var wants: [MockWant] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var healthLabel = "API: not checked"

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading wants...")
                } else if let errorMessage {
                    ContentUnavailableView("Unable to Load Wants", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                } else if wants.isEmpty {
                    ContentUnavailableView("No Active Wants", systemImage: "tray", description: Text("Your wants from SMS and iOS will appear here."))
                } else {
                    List(wants) { want in
                        NavigationLink(destination: WantDetailView()) {
                            WantRowView(want: want)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Wants")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Refresh") {
                        Task {
                            await loadWants()
                            await refreshHealth()
                        }
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Text(healthLabel)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial)
            }
            .task {
                await loadWants()
                await refreshHealth()
            }
        }
    }

    private func loadWants() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
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

    private func refreshHealth() async {
        do {
            let health = try await APIClient.shared.fetchHealth()
            healthLabel = "API: \(health.service): \(health.ok ? "ok" : "not ok")"
        } catch {
            healthLabel = "API: unavailable"
        }
    }
}

private struct WantRowView: View {
    let want: MockWant

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(want.title)
                .font(.headline)
                .lineLimit(2)

            HStack {
                Label(want.status, systemImage: "clock")
                Spacer()
                Text(want.location)
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
