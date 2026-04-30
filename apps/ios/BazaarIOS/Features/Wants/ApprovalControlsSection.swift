import SwiftUI

struct ApprovalControlsSection: View {
    @Binding var allowSellerContact: Bool
    @Binding var allowOffers: Bool
    @Binding var allowPurchase: Bool

    var body: some View {
        Section {
            Toggle("Allow seller contact", isOn: $allowSellerContact)
            Toggle("Allow offers", isOn: $allowOffers)
            Toggle("Allow purchase", isOn: $allowPurchase)
        } header: {
            Text("Approval Controls")
        } footer: {
            Text("These controls gate what the agent can do without asking you first.")
        }
    }
}
