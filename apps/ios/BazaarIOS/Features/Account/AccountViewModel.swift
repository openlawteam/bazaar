import Foundation
import Combine

@MainActor
final class AccountViewModel: ObservableObject {
    @Published var phoneNumber = ""
    @Published var verificationCode = ""
    @Published var isLoading = false
    @Published var state: AccountAuthState = .enterPhone

    func sendOTP() async {
        let digits = phoneNumber.filter(\.isNumber)
        guard digits.count >= 10 else {
            state = .error("Please enter a valid phone number.")
            return
        }

        isLoading = true
        defer { isLoading = false }

        try? await Task.sleep(nanoseconds: 700_000_000)
        state = .codeSent
    }

    func verifyOTP() async {
        guard verificationCode.count == 6 else {
            state = .error("Code must be 6 digits.")
            return
        }

        isLoading = true
        defer { isLoading = false }

        try? await Task.sleep(nanoseconds: 700_000_000)

        if verificationCode == "123456" {
            state = .verified
            return
        }

        state = .error("Invalid code. Use 123456 for this demo.")
    }

    func reset() {
        verificationCode = ""
        state = .enterPhone
    }
}
