import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { API } from "../lib/api.js";

export default function AuthButton({ mode = "signup", className = "btn", children }) {
  const Clerk = mode === "signin" ? SignInButton : SignUpButton;
  return (
    <>
      <Show when="signed-out">
        <Clerk mode="modal" forceRedirectUrl={API}>
          <button className={className}>{children}</button>
        </Clerk>
      </Show>
      <Show when="signed-in">
        {mode === "signup" && (
          <a href={API} className={className}>Open terminal</a>
        )}
      </Show>
    </>
  );
}