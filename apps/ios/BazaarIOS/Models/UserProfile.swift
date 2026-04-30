import Foundation

enum ShippingPreference: String, CaseIterable, Identifiable, Codable {
    case localOnly = "local_only"
    case shippingOK = "shipping_ok"
    case preferShipping = "prefer_shipping"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .localOnly:
            return "Local Only"
        case .shippingOK:
            return "Shipping OK"
        case .preferShipping:
            return "Prefer Shipping"
        }
    }
}

enum BudgetStyle: String, CaseIterable, Identifiable, Codable {
    case lowestPrice = "lowest_price"
    case bestValue = "best_value"
    case premiumDiscount = "premium_discount"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .lowestPrice:
            return "Lowest Price"
        case .bestValue:
            return "Best Value"
        case .premiumDiscount:
            return "Premium Discount"
        }
    }
}

enum ApprovalPolicy: String, CaseIterable, Identifiable, Codable {
    case askBeforeContact = "ask_before_contact"
    case askBeforeOffer = "ask_before_offer"
    case autonomousUntilPurchase = "autonomous_until_purchase"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .askBeforeContact:
            return "Ask Before Contact"
        case .askBeforeOffer:
            return "Ask Before Offer"
        case .autonomousUntilPurchase:
            return "Autonomous Until Purchase"
        }
    }
}

struct UserProfile: Identifiable, Codable {
    let id: String
    var phoneNumber: String
    var displayName: String
    var homeLocationLabel: String
    var pickupRadiusMiles: Int
    var shippingPreference: ShippingPreference
    var budgetStyle: BudgetStyle
    var approvalPolicy: ApprovalPolicy
}

extension UserProfile {
    static let mock = UserProfile(
        id: "user_demo_1",
        phoneNumber: "+1 555 111 2222",
        displayName: "Suvina",
        homeLocationLabel: "Brooklyn, NY",
        pickupRadiusMiles: 15,
        shippingPreference: .shippingOK,
        budgetStyle: .bestValue,
        approvalPolicy: .askBeforeContact
    )
}
