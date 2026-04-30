import SwiftUI

struct WantsHomeView: View {
    @StateObject private var viewModel = WantsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading wants...")
                } else if let errorMessage = viewModel.errorMessage {
                    ContentUnavailableView("Unable to Load Wants", systemImage: "exclamationmark.triangle", description: Text(errorMessage))
                } else if viewModel.wants.isEmpty {
                    ContentUnavailableView("No Active Wants", systemImage: "tray", description: Text("Your wants from SMS and iOS will appear here."))
                } else {
                    List(viewModel.wants) { want in
                        NavigationLink(
                            destination: WantDetailView(
                                title: want.title,
                                status: want.status,
                                location: want.location,
                                budgetText: want.budgetText
                            )
                        ) {
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
                            await viewModel.loadWants()
                            await viewModel.refreshHealth()
                        }
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Text(viewModel.healthLabel)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial)
            }
            .task {
                await viewModel.loadWants()
                await viewModel.refreshHealth()
            }
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
