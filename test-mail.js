// test-mail.js
import { sendJoinMail } from "./src/lib/mailer.js";

(async () => {
  const result = await sendJoinMail({ role: "test-email", message: "This is only a test" });
  console.log(result);
})();