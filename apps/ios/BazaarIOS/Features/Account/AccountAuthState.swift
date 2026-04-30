import Foundation

enum AccountAuthState: Equatable {
    case enterPhone
    case codeSent
    case verified
    case error(String)
}
