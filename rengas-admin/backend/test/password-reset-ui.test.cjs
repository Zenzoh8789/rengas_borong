const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup(overrides = {}) {
  const states = []; let cursor = 0;
  const calls = [], notices = [];
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === "function" ? value(states[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = { current: initial };
      return states[i];
    },
  };
  const app = {
    requestPasswordReset: async phone => { calls.push(["send", phone]); return { developmentOtp: "123456" }; },
    verifyPasswordResetOtp: async (phone, otp) => { calls.push(["verify", phone, otp]); return "verified-token"; },
    resetPassword: async (token, password) => { calls.push(["reset", token, password]); return true; },
    notify: message => notices.push(message),
    ...overrides,
  };
  const mocks = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx }, "lucide-react": {},
    "react-router-dom": { useLocation: () => ({ state: null }), useNavigate: () => () => {}, Link: "Link" },
    "../components/BrandLogo": { BrandLogo: "Logo" }, "../context/AppContext": { useApp: () => app },
  };
  const source = fs.readFileSync(path.join(__dirname, "../../../delivery-customer-web/apps/web/src/pages/LoginPage.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const context = { exports: {}, require: name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; }, TextEncoder };
  vm.runInNewContext(compiled.outputText, context);
  const flatten = node => !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  const render = () => { cursor = 0; return flatten(context.exports.LoginPage()); };
  return {
    calls, notices, render,
    change: (placeholder, value) => render().find(n => n.props?.placeholder === placeholder).props.onChange({ target: { value } }),
    click: className => render().find(n => n.props?.className === className).props.onClick(),
    submit: () => render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} }),
  };
}

test("forgot password shows code, validates confirmation, saves and returns to sign in", async () => {
  const h = setup();
  h.click("auth-forgot-link");
  h.change("Enter your phone number", "60123456789");
  await h.submit();
  assert.ok(h.render().some(n => n.type === "strong" && n.props.children === "123456"));
  h.change("••••••", "123456");
  await h.submit();
  h.change("Enter your new password", "NewPassword2");
  h.change("Confirm your new password", "DifferentPassword");
  await h.submit();
  assert.equal(h.calls.filter(c => c[0] === "reset").length, 0);
  assert.ok(h.notices.includes("Passwords do not match."));
  h.change("Confirm your new password", "NewPassword2");
  await h.submit();
  assert.deepEqual(h.calls.at(-1), ["reset", "verified-token", "NewPassword2"]);
  assert.ok(h.render().some(n => n.props?.placeholder === "Enter your password" && n.props.value === ""));
});

test("back after verification restarts recovery instead of reusing consumed OTP", async () => {
  const h = setup();
  h.click("auth-forgot-link");
  h.change("Enter your phone number", "60123456789");
  await h.submit();
  h.change("••••••", "123456");
  await h.submit();
  h.click("auth-back");
  assert.ok(h.render().some(n => n.type === "h1" && n.props.children === "Forgot Password"));
  assert.ok(!h.render().some(n => n.props?.placeholder === "Enter your new password"));
});

test("failed OTP delivery keeps the phone form available", async () => {
  const h = setup({ requestPasswordReset: async () => null });
  h.click("auth-forgot-link");
  h.change("Enter your phone number", "60123456789");
  await h.submit();
  assert.ok(h.render().some(n => n.type === "h1" && n.props.children === "Forgot Password"));
});
