Parse.Cloud.define("generateResetToken", async (request) => {
    const { username } = request.params;

    if (!username) {
        throw new Parse.Error(141, "Missing username or email");
    }

    console.log("Searching for user:", username);

    // Try to find user by username first
    let query = new Parse.Query(Parse.User);
    query.equalTo("username", username);
    query.limit(1);
    let user = await query.first({ useMasterKey: true });

    // If not found, try email
    if (!user) {
        const emailQuery = new Parse.Query(Parse.User);
        emailQuery.equalTo("username", username);
        emailQuery.limit(1);
        user = await emailQuery.first({ useMasterKey: true });
    }

    console.log("Found user:", user ? user.get("username") : "not found");

    if (!user.get("username")) {
        throw new Parse.Error(141, "The user does not have an email address set");
    }

    // Generate a random token
    const token = Math.random().toString(36).substring(2, 15);
    user.set("passwordResetToken", token);
    await user.save(null, { useMasterKey: true });

    // Optionally, send email via your Mailgun adapter
    await Parse.Cloud.sendEmail({
        to: user.get("username"),
        from: "Backend Server <postmaster@sandbox307339f7ef3b44138abf7179e9af373d.mailgun.org>",
        subject: "Reset your password",
        text: `Hi ${user.get("name") || user.get("username")},

Use the following link to reset your password:
http://localhost:8080/resetPassword?token=${token}

If you didn't request this, ignore this email.
Thanks, Backend Server Team`,
    });

    return { message: "Reset token generated and email sent" };
});

// Cloud function to reset password using a token
Parse.Cloud.define("resetPassword", async (request) => {
    const { token, newPassword } = request.params;

    // Validate input
    if (!token || !newPassword) {
        throw new Parse.Error(141, "Missing token or password");
    }

    // Find user by password reset token
    const query = new Parse.Query(Parse.User);
    query.equalTo("passwordResetToken", token);
    const user = await query.first({ useMasterKey: true });

    if (!user) {
        throw new Parse.Error(101, "Invalid or expired token");
    }

    // Set new password and clear token
    user.set("password", newPassword);
    user.unset("passwordResetToken");

    await user.save(null, { useMasterKey: true });

    return { message: "Password reset successfully" };
});

Parse.Cloud.define("checkUserByEmail", async (request) => {
    const { email } = request.params;

    if (!email) {
        throw new Parse.Error(141, "Email is required");
    }

    const query = new Parse.Query(Parse.User);
    query.equalTo("username", email); // or username if you store email there
    const user = await query.first({ useMasterKey: true });

    if (!user) {
        throw new Parse.Error(101, "User does not exist.");
    }

    return {
        objectId: user.id,
        username: user.get("username"),
        name: user.get("name"),
        email: user.get("username"),
        role: user.get("role"),
    };
});

Parse.Cloud.define("sendUserEmail", async (request) => {
    const {
        id,
        firstname,
        name,
        email,
        approver,
        message,
        date,
        file,
        approved,
        reject,
        revise,
    } = request.params;

    if (!email) {
        throw new Parse.Error(141, "Missing recipient email");
    }

    // Example using Mailgun adapter configured in Parse Server
    try {
        await Parse.Cloud.sendEmail({
            to: email,
            from: "Backend Server <postmaster@sandbox307339f7ef3b44138abf7179e9af373d.mailgun.org>",
            subject: `Workflow Initiation: ${name || "Workflow"}`,
            text: `Hi ${firstname || "User"},\nYour workflow ${name || ""} has been initiated on ${date || ""}.\nMessage: ${message || ""}`,
            html: `
                <p>Hi ${firstname || "User"},</p>
                <p>Your workflow <b>${name || ""}</b> has been initiated on ${date || ""}.</p>
                <p>Message: ${message || ""}</p>
                <p>Approvers: ${JSON.stringify(approver || [])}</p>
                ${file && file.length
                    ? `<p>Files:</p><ul>${file.map(f => `<li><a href="${f.url}">${f.name}</a></li>`).join("")}</ul>`
                    : ""
                }
                <p>Status options: ${approved || ""}, ${reject || ""}, ${revise || ""}</p>
            `,
        });

        return { message: "Email successfully sent" };
    } catch (err) {
        throw new Parse.Error(141, "Failed to send email: " + err.message);
    }
});

const { HybridTree } = require('./hybrid_tree.js'); // Adjust path if needed

Parse.Cloud.define("getApprovalsForUser", async (request) => {
    const currentUser = request.user;
    if (!currentUser) throw "Not logged in";

    const email = currentUser.get("username"); // Current user's email

    const Workflow = Parse.Object.extend("Workflow_Initiation_History");
    const query = new Parse.Query(Workflow);

    // Optional: only workflows where the current user is an approver
    query.exists("approvers");

    const results = await query.find({ useMasterKey: true });

    const approvals = await Promise.all(
        results.map(async (record) => {
            // Fetch userInitiated safely using Master Key
            const user = record.get("userInitiated");
            let initiatedBy = "Unknown";
            if (user) {
                await user.fetch({ useMasterKey: true });
                initiatedBy = user.get("name") || user.get("username") || "Unknown";
            }

            // Get files
            const userFiles = record.get("userFile") || [];
            const files = userFiles.map((file) => ({
                name: file.name().substring(file.name().indexOf("_") + 1),
                url: file.url(),
            }));

            // Approvers tree
            const approversData = record.get("approvers") || [];
            const tree = new HybridTree(approversData);

            // Get status and role for current user
            const status = tree.getStatus(email) || "Hidden";
            const role = tree.getRole(email) || "Unknown";

            if (status === "Hidden" || status === "Approved" || status === "Reject" || status === "Revise") return null; // skip hidden workflows

            return {
                id: record.id,
                initiated: initiatedBy,
                date: record.createdAt ? record.createdAt.toLocaleDateString() : "Unknown",
                process: record.get("processName") || "No Process Name",
                description: record.get("message") || "No Description",
                status: status,
                roles: role,
                files: files,
            };
        })
    );

    // Remove nulls (Hidden workflows)
    return approvals.filter((a) => a !== null);
});