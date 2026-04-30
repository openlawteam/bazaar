import SwiftUI

struct ProfileHomeView: View {
    @State private var displayName = "Suvina"
    @State private var phoneNumber = "+1 555 111 2222"
    @State private var homeArea = "Brooklyn, NY"
    @State private var pickupRadiusMiles = 15
    @State private var shipping = "Shipping OK"
    @State private var budgetStyle = "Best Value"
    @State private var approvalPolicy = "Ask Before Contact"
    @State private var saveStatus = "Not saved"

    var body: some View {
        NavigationStack {
            Form {
                Section("Identity") {
                    TextField("Display name", text: $displayName)
                    TextField("Phone", text: $phoneNumber)
                        .keyboardType(.phonePad)
                }

                Section("Location") {
                    TextField("Home area", text: $homeArea)
                    Stepper(
                        "\(pickupRadiusMiles) mile pickup radius",
                        value: $pickupRadiusMiles,
                        in: 1...100
                    )
                }

                Section("Shopping Preferences") {
                    Picker("Shipping", selection: $shipping) {
                        ForEach(["Local Only", "Shipping OK", "Prefer Shipping"], id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }

                    Picker("Budget Style", selection: $budgetStyle) {
                        ForEach(["Lowest Price", "Best Value", "Premium Discount"], id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }

                    Picker("Approval Policy", selection: $approvalPolicy) {
                        ForEach(["Ask Before Contact", "Ask Before Offer", "Autonomous Until Purchase"], id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }
                }

                Section {
                    Button("Save Profile") {
                        saveStatus = "Saved locally at \(Date.now.formatted(date: .omitted, time: .shortened))"
                    }
                }

                Section {
                    Text(saveStatus)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Profile")
        }
    }
}
