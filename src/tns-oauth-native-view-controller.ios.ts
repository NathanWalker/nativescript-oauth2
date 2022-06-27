import { Frame } from "@nativescript/core";

import {
  TnsOAuthClient,
  ITnsOAuthTokenResult,
  TnsOAuthClientLoginBlock,
  TnsOAuthClientLogoutBlock,
} from "./index";
import {
  ITnsOAuthLoginController,
  TnsOAuthLoginSubController,
} from "./tns-oauth-login-sub-controller";

let TnsOAuthLoginNativeViewController;
let loginController: TnsOAuthLoginSubController;
let safariViewController: SFSafariViewController;
let delegate;
function setup() {
  @NativeClass()
  class TnsOauthSafariDelegateImpl
    extends NSObject
    implements SFSafariViewControllerDelegate
  {
    static ObjCProtocols = [SFSafariViewControllerDelegate];
    static initWithOwner() {
      return <TnsOauthSafariDelegateImpl>(
        TnsOauthSafariDelegateImpl.new()
      );
    }
    safariViewControllerDidCompleteInitialLoad(
      controller: SFSafariViewController,
      didLoadSuccessfully: boolean
    ): void {
      console.log(
        "safariViewControllerDidCompleteInitialLoad:",
        didLoadSuccessfully
      );
    }
    safariViewControllerInitialLoadDidRedirectToURL(
      controller: SFSafariViewController,
      URL: NSURL
    ): void {
      console.log(
        "safariViewControllerInitialLoadDidRedirectToURL:",
        URL.absoluteString
      );
    }
    safariViewControllerWillOpenInBrowser(
      controller: SFSafariViewController
    ): void {
      console.log("safariViewControllerWillOpenInBrowser");
    }
    safariViewControllerDidFinish(controller: SFSafariViewController): void {
      console.log(
        "safariViewControllerDidFinish"
      );
        if (controller !== safariViewController) {
          // Ignore this call if safari view controller doesn't match
          return;
        }

        // console.log('loginController:', loginController)
        if (loginController) {
          if (!loginController.authState) {
            // Ignore this call if there is no pending login flow
            return;
          }
  
          console.log(
            "safariViewControllerDidFinish about to cancel."
          );
          const er = "The login operation was canceled.";
          loginController.completeLoginWithTokenResponseError(null, er);
        }
      
    }
  }
  @NativeClass()
  class TnsOAuthLoginNativeViewControllerImpl
    extends NSObject
    implements ITnsOAuthLoginController
  {

    public static initWithClient(client: TnsOAuthClient) {
      const instance = <TnsOAuthLoginNativeViewControllerImpl>TnsOAuthLoginNativeViewControllerImpl.new();
      loginController = new TnsOAuthLoginSubController(client);
      return instance;
    }

    public loginWithParametersFrameCompletion(
      parameters,
      frame: Frame,
      urlScheme?: string,
      completion?: TnsOAuthClientLoginBlock
    ) {
      const fullUrl = loginController.preLoginSetup(
        frame,
        urlScheme,
        completion
      );

      this.openUrlWithParametersCompletion(fullUrl, frame);
    }

    public logoutWithParametersFrameCompletion(
      parameters,
      frame: Frame,
      urlScheme?: string,
      completion?: TnsOAuthClientLogoutBlock
    ) {
      const fullUrl = loginController.preLogoutSetup(
        frame,
        urlScheme,
        completion
      );

      this.openUrlWithParametersCompletion(fullUrl, frame);
    }

    private openUrlWithParametersCompletion(
      fullUrl: string,
      frame: Frame
    ): void {
      safariViewController =
        SFSafariViewController.alloc().initWithURLEntersReaderIfAvailable(
          NSURL.URLWithString(fullUrl),
          false
        );

      delegate = TnsOauthSafariDelegateImpl.initWithOwner();
      safariViewController.delegate = delegate;

      if (frame.parent) {
        let topmostParent = frame.parent;
        while (topmostParent.parent) {
          topmostParent = topmostParent.parent;
        }
        topmostParent.viewController.presentViewControllerAnimatedCompletion(
          safariViewController,
          true,
          null
        );
      } else {
        frame.ios.controller.presentViewControllerAnimatedCompletion(
          safariViewController,
          true,
          null
        );
      }
    }

    public resumeWithUrl(url: string): boolean {
      return loginController.resumeWithUrl(
        url,
        (tokenResult: ITnsOAuthTokenResult, error) => {
          if (safariViewController) {
            safariViewController.dismissViewControllerAnimatedCompletion(
              true,
              () => {
                loginController.completeLoginWithTokenResponseError(
                  tokenResult,
                  error
                );
              }
            );
          } else {
            loginController.completeLoginWithTokenResponseError(
              tokenResult,
              error
            );
          }
        }
      );
    }
  }

  console.log('setup TnsOAuthLoginNativeViewController!')
  TnsOAuthLoginNativeViewController = TnsOAuthLoginNativeViewControllerImpl;
}

if (!TnsOAuthLoginNativeViewController) {
  setup();
}
export { TnsOAuthLoginNativeViewController };
