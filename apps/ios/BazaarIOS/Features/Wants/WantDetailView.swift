import SwiftUI

struct WantDetailView: View {
    @State private var allowSellerContact = false
    @State private var allowOffers = false
    @State private var allowPurchase = false

    var body: some View {
        Form {
            Section("Want") {
                Text("Sample Want")
                    .font(.headline)
                Text("Detail/status placeholder for this want.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section("Status") {
                LabeledContent("Current", value: "Searching")
                LabeledContent("Location", value: "Brooklyn, NY")
                LabeledContent("Budget", value: "$500")
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
