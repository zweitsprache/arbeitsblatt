# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate tutorial recorder
- Location: tests/tutorials/auth.setup.ts:8:6

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: Sign In
          - generic [ref=e7]: Enter your email below to login to your account
        - generic [ref=e10]:
          - generic [ref=e11]:
            - generic [ref=e12]: Email
            - textbox "Email" [ref=e13]:
              - /placeholder: m@example.com
              - text: admin@arbeitsblatt.ch
          - generic [ref=e14]:
            - generic [ref=e15]:
              - generic [ref=e16]: Password
              - link "Forgot your password?" [active] [ref=e17] [cursor=pointer]:
                - /url: /auth/forgot-password
            - textbox "Password" [ref=e19]
          - button "Login" [ref=e20]
        - generic [ref=e21]:
          - text: Don't have an account?
          - link "Sign Up" [ref=e22] [cursor=pointer]:
            - /url: /auth/sign-up
            - button "Sign Up" [ref=e23]
    - region "Notifications alt+T"
  - alert [ref=e24]
```