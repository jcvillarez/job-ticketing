<style>
.indv-treestructure-body {
  @apply bg-[url('@/assets/background-images/user.jpg')] bg-cover bg-fixed bg-no-repeat flex flex-col items-center justify-center font-['Inter'] h-[100vh] min-w-[800px];
}

/* lock */
.indv-treestructure-content {
  @apply flex flex-col items-center justify-start gap-[30px] grow w-full max-w-[1280px] py-[30px];
}

/* lock */

.indv-treestructure-content>span {
  @apply font-black text-[35px] text-left w-full px-[5px];
}

/* lock */

.indv-treestructure-content>form>button {
  @apply border-[1px] border-[#F18642] bg-[#F18642] text-white text-[13px] p-[10px] w-[150px];
}

.indv-treestructure-content>form>button:hover {
  @apply border-[#F18642] bg-transparent text-[#F18642] duration-75;
}

.indv-treestructure-frame {
  @apply overflow-auto w-full h-[1px] grow border-[1px] border-b-[#aaa] p-[30px];
}

.indv-treestructure-frame>ul {
  @apply inline-block;
}

.indv-treestructure-frame>table {
  @apply w-full;
}

.indv-treestructure-frame>table>tbody>tr {
  @apply border-b-[1px] border-b-[#aaa];
}

.indv-treestructure-frame>table>thead>tr>th {
  @apply text-[13px] p-[10px] font-bold sticky top-0 bg-white border-none;
}

.indv-treestructure-frame>table>tbody>tr>td {
  @apply text-left text-[13px] border-none p-[10px];
}
</style>

<template>
  <div class="indv-treestructure-body">
    <div class="indv-treestructure-content">
      <span>Workflow Structure</span>
      <div class="indv-treestructure-frame">
        <ul ref="treeContainer"></ul>
      </div>
      <form @submit.prevent="initiateWorkflow" method="post">
        <button type="submit" class="button-nodes">Initiate Workflow</button>
      </form>
    </div>
  </div>
  <div v-if="initiationMessage">
    <WorkflowLoader v-bind:initiationMessage="initiationMessage" />
  </div>
</template>
<script>
import "/src/assets/tailwind.css"; // added
import WorkflowLoader from "@/components/WorkflowLoader.vue";
import Parse from "parse";
import { HybridTree } from "@/hybrid_tree.js";
export default {
  data() {
    return {
      initiationMessage: "",
    };
  },
  components: {
    WorkflowLoader,
  },
  methods: {
    initiateWorkflow() {
      try {
        const currentUser = Parse.User.current();
        if (currentUser != null) {
          const userRole = currentUser.get("role");
          if (userRole === "user") {
            const Workflow = Parse.Object.extend("Workflow_Initiation_History");
            const id = this.$route.query.id;
            const workflow = new Workflow();

            let tree = HybridTree.fromDOM(this.$refs.treeContainer);

            workflow.set("objectId", id);
            workflow.set("approvers", tree.toJson());

            workflow.save().then(async () => {
              const Workflow = Parse.Object.extend(
                "Workflow_Initiation_History"
              );
              const query = new Parse.Query(Workflow);
              const id = this.$route.query.id;
              const entry = await query.get(id);
              const user = await entry.get("userInitiated");

              const firstname = await user.get("name");
              const processName = entry.get("processName");
              const email = tree.getEmails();
              const approver = entry.get("approvers");
              const message = entry.get("message");
              const date = entry.createdAt.toLocaleDateString();
              const approved = "Approved";
              const reject = "Reject";
              const revise = "Revise";
              const files = (entry.get("userFile") || []).map((obj) => ({
                name: obj.name().substring(obj.name().indexOf("_") + 1),
                url: obj.url(), // real URL from Parse Server
              }));

              Parse.Cloud.run("sendUserEmail", {
                id: id,
                firstname: firstname,
                name: processName,
                email: email,
                approver: approver,
                message: message,
                date: date,
                file: files,
                approved: approved,
                reject: reject,
                revise: revise,
              });
              this.initiationMessage = "It is done.";
            });
          } else {
            alert("You are not allowed to initiate workflow");
          }
        }
      } catch (error) {
        console.log({ error });
      }
    },
    createButton(text, action) {
      let button = document.createElement("button");
      button.innerHTML = text;
      button.onclick = action;
      button.classList = `
          border-[1px] border-[#F18642] bg-[#F18642] text-white text-[13px] p-[10px] w-[150px] hover:border-[#F18642]
          hover:bg-transparent hover:text-[#F18642] hover:duration-75
        `;

      return button;
    },
    initializeList(parent) {
      // Initial "Add Broadcast Approver" button
      const buttonHolder = document.createElement("li");
      buttonHolder.classList = "border-[5px] border-[#F18642]/20 p-[30px]";

      const addButton = this.createButton("Add Broadcast Approver");
      buttonHolder.appendChild(addButton);
      parent.appendChild(buttonHolder);

      addButton.onclick = () => {
        // Container for user input
        const container = document.createElement("div");
        container.classList =
          "flex flex-row gap-5 items-center justify-center border-[5px] border-[#F18642]/20 p-[30px]";

        const input = document.createElement("input");
        input.setAttribute("type", "email");
        input.setAttribute("placeholder", "Email Address");
        input.classList = "border-[1px] border-[#aaa] text-[13px] p-[10px] w-[200px];";

        const roleInput = document.createElement("select");
        roleInput.classList = "border-[1px] border-[#aaa] text-[13px] p-[10px] w-[200px];";
        ["Viewer", "Approver", "Acknowledger", "Endorser"].forEach((role) => {
          const option = document.createElement("option");
          option.value = role;
          option.text = role;
          roleInput.appendChild(option);
        });

        const submit = this.createButton("OK", async () => {
          const email = input.value.trim();
          const role = roleInput.value;

          // Validate email format
          const emailPattern = /^\S+@\S+\.\S+$/;
          if (!emailPattern.test(email)) {
            alert("Please enter a valid email address");
            return;
          }

          // Call cloud function for a single email
          let user;
          try {
            user = await Parse.Cloud.run("checkUserByEmail", { email });
          } catch (err) {
            alert(err.message || "User does not exist");
            return;
          }

          // Create new list item for this approver
          const item = document.createElement("li");
          item.classList = "flex flex-row gap-3 items-center justify-end";
          item.setAttribute("data-email", user.email);
          item.setAttribute("data-role", role);
          item.innerText = `${user.email} (${role})`;

          // Nested sequential approvers container
          const nestedList = document.createElement("ul");
          nestedList.classList = "border-[5px] border-[#F18642] p-[30px] mb-[30px]";

          // Add child button
          const addChildButton = this.createButton("Add Sequential Approver");
          addChildButton.classList =
            "border-[1px] border-[#F18642] bg-[#F18642] text-white text-[13px] p-[10px] hover:border-[#F18642] hover:bg-transparent hover:text-[#F18642] hover:duration-75";
          addChildButton.onclick = () => {
            this.initializeList(nestedList);
            nestedList.setAttribute("data-parent", user.email);
            item.removeChild(addChildButton);
          };

          // Delete button
          const deleteButton = this.createButton("Delete", () => {
            parent.removeChild(item);
            parent.removeChild(nestedList);
          });
          deleteButton.classList =
            "border-[1px] border-[#F18642] bg-[#F18642] text-white text-[13px] p-[10px] hover:border-[#F18642] hover:bg-transparent hover:text-[#F18642] hover:duration-75";

          item.appendChild(deleteButton);
          item.appendChild(addChildButton);

          // Insert items into parent
          parent.insertBefore(item, container);
          parent.replaceChild(buttonHolder, container);
          parent.insertBefore(nestedList, item.nextSibling);
        });

        const cancel = this.createButton("Cancel", () => {
          parent.replaceChild(buttonHolder, container);
        });

        container.appendChild(input);
        container.appendChild(roleInput);
        container.appendChild(submit);
        container.appendChild(cancel);

        parent.replaceChild(container, buttonHolder);
      };
    }
  },
  mounted: function () {
    this.initializeList(this.$refs.treeContainer);
  },
};
</script>
