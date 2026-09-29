//
//  SafariWebExtensionHandler.swift
//  FocusLitSafari Extension
//
//  Created by Andrew Chen on 9/28/26.
//

import SafariServices
import os

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private static let protocolVersion = 1
    private static let testPagePathMarker = "/focuslit-safari-test-page/index.html"

    private struct SafariTabObserved: Decodable {
        struct Page: Decodable {
            let windowId: Int
            let tabId: Int
        }

        let type: String
        let protocolVersion: Int
        let messageId: String
        let page: Page
        let url: String
        let title: String
        let observedAtMs: Int64
    }

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let rawMessage = nativeMessage(from: request)

        guard let observed = decodeAndValidate(rawMessage) else {
            complete(context, message: ["type": "safariRejected", "reason": "invalidMessage"])
            return
        }

        // This first Safari slice deliberately proves only JS -> native
        // delivery. It does not retain page data or grant close authority;
        // the later Electron bridge must be separately authenticated.
        os_log(
            "Accepted Safari fixture observation %{public}@",
            log: .default,
            type: .info,
            observed.messageId
        )
        complete(context, message: [
            "type": "safariWelcome",
            "protocolVersion": Self.protocolVersion,
        ])
    }

    private func nativeMessage(from request: NSExtensionItem?) -> Any? {
        if #available(iOS 15.0, macOS 11.0, *) {
            return request?.userInfo?[SFExtensionMessageKey]
        }
        return request?.userInfo?["message"]
    }

    private func decodeAndValidate(_ rawMessage: Any?) -> SafariTabObserved? {
        guard
            let rawMessage,
            JSONSerialization.isValidJSONObject(rawMessage),
            let data = try? JSONSerialization.data(withJSONObject: rawMessage),
            let message = try? JSONDecoder().decode(SafariTabObserved.self, from: data),
            message.type == "safariTabObserved",
            message.protocolVersion == Self.protocolVersion,
            UUID(uuidString: message.messageId) != nil,
            message.page.windowId >= 0,
            message.page.tabId >= 0,
            message.observedAtMs >= 0,
            message.url.utf8.count <= 4096,
            message.title.utf8.count <= 1024,
            let url = URL(string: message.url),
            url.isFileURL,
            url.path.hasSuffix(Self.testPagePathMarker)
        else {
            return nil
        }
        return message
    }

    private func complete(_ context: NSExtensionContext, message: [String: Any]) {
        let response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            response.userInfo = [SFExtensionMessageKey: message]
        } else {
            response.userInfo = ["message": message]
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

}
