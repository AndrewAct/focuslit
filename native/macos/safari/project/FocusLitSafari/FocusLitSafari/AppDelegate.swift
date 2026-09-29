//
//  AppDelegate.swift
//  FocusLitSafari
//
//  Created by Andrew Chen on 9/28/26.
//

import Cocoa

@main
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private var hasPresentedBridgeWindow = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        // AppKit restores any stale development windows after this callback.
        // Replace them on the next run-loop turn once restoration has finished.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.presentBridgeWindow()
        }
    }

    private func presentBridgeWindow() {
        guard !hasPresentedBridgeWindow else { return }
        hasPresentedBridgeWindow = true

        // The generated storyboard does not reliably load its Swift controller
        // outside Xcode. Own the development-status window directly after the
        // app's restoration cycle, which otherwise revives its old blank view.
        let restoredWindows = NSApplication.shared.windows
        let window = restoredWindows.first ?? NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 425, height: 325),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        restoredWindows.dropFirst().forEach { $0.close() }
        window.center()
        window.contentViewController = ViewController()
        window.title = "FocusLit Safari Bridge"
        window.makeKeyAndOrderFront(nil)
        self.window = window
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

}
