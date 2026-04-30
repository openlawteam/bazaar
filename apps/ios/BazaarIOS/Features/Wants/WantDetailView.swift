import SwiftUI

struct WantDetailView: View {
    let title: String
    let status: String
    let location: String
    let budgetText: String
    @State private var allowSellerContact = false
    @State private var allowOffers = false
    @State private var allowPurchase = false

    var body: some View {
        Form {
            Section("Want") {
                Text(title)
                    .font(.headline)
                Text("Detail/status placeholder for this want.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section("Status") {
                LabeledContent("Current", value: status)
                LabeledContent("Location", value: location)
                LabeledContent("Budget", value: budgetText)
            }

            ApprovalControlsSection(
                allowSellerContact: $allowSellerContact,
                allowOffers: $allowOffers,
                allowPurchase: $allowPurchase
            )
        }
        .navigationTitle("Want Detail")
    }
}
