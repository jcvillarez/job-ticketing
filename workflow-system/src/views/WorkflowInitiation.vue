<template>
  <div class="indv-create-body">
    <NavBarComponent />
    <div class="indv-create-content">
      <span>Create Custom Workflow</span>

      <form class="indv-create-table-frame" @submit.prevent="initiateWorkflow" method="post">
        <span>Process Name</span>
        <input id="processNameInput" type="text" required v-model="processName" @focus="showProcessNameByTextbox = true"
          @blur="showProcessNameByTextbox = false" />
        <div v-if="showProcessNameByTextbox">
          Process name is the organizational process of the organization where
          workflow will be created for.
        </div>
        <span>Description</span>
        <div ref="editor">
          <textarea type="string" v-model="message"></textarea>
        </div>
        <span>Upload Document/s (PDF)</span>
        <div>
          <input type="file" id="pdfUpload" accept=".pdf" multiple="true" required />
          <button type="submit">Create Workflow</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import "/src/assets/tailwind.css"; // added
import Quill from "quill";
import NavBarComponent from "@/components/NavBarComponent.vue";
import Parse from "parse";
export default {
  name: "WorkflowInitiation",
  components: {
    NavBarComponent,
  },
  data() {
    return {
      processName: "",
      message: "",
      userFile: [],
      showProcessNameByTextbox: false,
    };
  },
  mounted() {
    this.editor = new Quill(this.$refs.editor, {
      theme: "snow",
      modules: {
        toolbar: [
          ["bold", "italic", "underline", "strike"],
          ["blockquote", "code-block"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
        ],
      },
    });
    this.editor.on("text-change", this.handleEditorChange);
  },
  methods: {
    handleEditorChange() {
      const editorContent = this.editor.root.innerHTML;
      const divElement = document.createElement("div");
      divElement.innerHTML = editorContent;
      this.message = divElement.innerText;
    },
    updateDescription() {
      const divElement = document.createElement("div");
      divElement.innerText = this.message;
      this.editor.root.innerHTML = divElement.innerHTML;
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      const fileType = file.type;
      const fileName = file.name;

      // Check for invalid characters in filename
      const invalidChars = /[/?*:;{}\\]+/;
      if (invalidChars.test(fileName)) {
        alert("The filename contains invalid characters.");
        this.$refs.fileInput.value = "";
        return;
      }

      if (fileType !== "application/pdf") {
        alert("Please upload a PDF file.");
        this.$refs.fileInput.value = "";
        return;
      }
    },
    async initiateWorkflow() {
      const currentUser = Parse.User.current();
      if (!currentUser) return this.$router.push({ name: "LoginView" });

      try {
        const userUploadControl = document.getElementById("pdfUpload");
        const files = userUploadControl.files;
        if (!files || files.length === 0) {
          alert("Please upload at least one PDF file.");
          return;
        }

        // Save files properly
        const parseFiles = [];
        for (let i = 0; i < files.length; i++) {
          const parseFile = new Parse.File(files[i].name, files[i]);
          await parseFile.save(); // ✅ wait for save
          parseFiles.push(parseFile);
        }

        // Save workflow object
        const Workflow = Parse.Object.extend("Workflow_Initiation_History");
        const workflow = new Workflow();
        workflow.set("userInitiated", currentUser);
        workflow.set("processName", this.processName);
        workflow.set("message", this.message);
        workflow.set("userFile", parseFiles); // attach saved Parse.File objects
        await workflow.save();

        // Redirect to tree structure
        this.$router.push({
          name: "TreeStructure",
          query: { id: workflow.id },
        });

      } catch (error) {
        console.log("Error creating workflow:", error);
      }
    }
  },
};
</script>
<style>
@import "~quill/dist/quill.core.css";
@import "~quill/dist/quill.snow.css";

.indv-create-body {
  @apply flex flex-col items-center justify-center font-['Inter'] h-[100vh] min-w-[800px];
}

/* lock */
.indv-create-content {
  @apply flex flex-col items-start justify-start grow w-full max-w-[1280px] py-[30px];
}

/* lock */

.indv-create-content>span {
  @apply font-black text-[35px] text-left w-full px-[5px];
}

/* lock */

.indv-create-table-frame {
  @apply flex flex-col items-start justify-start gap-3 w-full grow;
}

.indv-create-table-frame>div {
  @apply flex flex-row w-full gap-3;
}

.indv-create-table-frame input,
.indv-create-table-frame>textarea {
  @apply border-[1px] border-[#aaa] text-[13px] p-[10px] w-full;
}

.indv-create-table-frame>textarea {
  @apply grow resize-none;
}

.indv-create-table-frame button {
  @apply border-[1px] border-[#F18642] bg-[#F18642] text-white text-[13px] p-[10px] w-[170px] rounded-[5px];
}

.indv-create-table-frame button:hover {
  @apply border-[#F18642] bg-transparent text-[#F18642] duration-75;
}

.login-frame>div>input {
  @apply border-[1px] border-[#aaa] text-[13px] p-[10px] w-full;
}
</style>
