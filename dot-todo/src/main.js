import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import "./style.css";

const firebaseConfig = {
  apiKey: "AIzaSyBaUuUup4SW53sqom_4PE-GdqWX1yv_-Fg",
  authDomain: "dot-todo-dd4be.firebaseapp.com",
  projectId: "dot-todo-dd4be",
  storageBucket: "dot-todo-dd4be.firebasestorage.app",
  messagingSenderId: "900862622716",
  appId: "1:900862622716:web:8594535045fbc0fb709079",
  measurementId: "G-SQ06L8RY5L",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const loginForm = document.getElementById("auth-form");
const signupButton = document.getElementById("signup-btn");
const logoutButton = document.getElementById("logout");
const authMessage = document.getElementById("auth-message");
const appContainer = document.getElementById("app-container");

const container = document.querySelector(".task-container");
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const dueDateSelect = document.getElementById("due-date-select");

let tasksRef = null;
var totalTasks = 0;
var completedTasks = 0;
var currentTasks = 0;
// -------------------- AUTH --------------------

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = `${username}@dotapp.local`;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authMessage.innerText = err.message;
  }
});

signupButton.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = `${username}@dotapp.local`;

  if (!username || !password) {
    authMessage.innerText = "Username and password required.";
    return;
  }

  if (password.length < 6) {
    authMessage.innerText = "Password must be at least 6 characters.";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authMessage.innerText = err.message;
  }
});

logoutButton.addEventListener("click", () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginForm.style.display = "none";
    appContainer.style.display = "block";
    tasksRef = collection(db, "users", user.uid, "tasks");
    loadTasks();
  } else {
    appContainer.style.display = "none";
    loginForm.style.display = "flex";
    authMessage.innerText = "";
  }
});

// -------------------- TASKS --------------------

dueDateSelect.classList.add("no-due-date");
dueDateSelect.addEventListener("change", () => {
  if (dueDateSelect.value === "none") {
    dueDateSelect.classList.remove("today-due-date", "tomorrow-due-date");
    dueDateSelect.classList.add("no-due-date");
  } else if (dueDateSelect.value === "today") {
    dueDateSelect.classList.remove("tomorrow-due-date", "no-due-date");
    dueDateSelect.classList.add("today-due-date");
  } else {
    dueDateSelect.classList.remove("today-due-date", "no-due-date");
    dueDateSelect.classList.add("tomorrow-due-date");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const taskText = input.value.trim();
  if (!taskText) return;

  const dueValue = dueDateSelect.value;
  let dueDate = null;

  if (dueValue === "today") {
    dueDate = new Date();
  } else if (dueValue === "tomorrow") {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    dueDate = t;
  }

  await addDoc(tasksRef, {
    text: taskText,
    dueDate: dueDate ? dueDate.toISOString() : null,
    completed: false,
    completionDate: null,
  });

  input.value = "";
  dueDateSelect.value = "none";
  dueDateSelect.classList.remove("today-due-date", "tomorrow-due-date");
  dueDateSelect.classList.add("no-due-date");
  loadTasks();
});

async function loadTasks() {
  totalTasks = 0;
  completedTasks = 0;
  container.innerHTML = "";
  const snapshot = await getDocs(tasksRef);
  snapshot.forEach((docSnap) => {
    if (!docSnap.data().completed) {
      currentTasks++;
      totalTasks++;
      const taskText = docSnap.data().text;
      const taskDiv = document.createElement("div");
      taskDiv.className = "task";
      const dueDateStr = docSnap.data().dueDate;
      const formattedDueDate = new Date(dueDateStr).toLocaleDateString();
      const todayStr = new Date().toLocaleDateString();
      console.log(todayStr);
      console.log(formattedDueDate);
      taskDiv.innerHTML = `
      <label class="circle-checkbox">
        <input type="checkbox" />
        <span class="custom-check"></span>
        <span class="task-text">${taskText}</span>
      </label>
      <div class="due-card" style="background-color: ${
        dueDateStr && formattedDueDate < todayStr
          ? "#ff7b7b"
          : dueDateStr && formattedDueDate == todayStr
          ? "#f8c471"
          : "#c7d2fe"
      }">${
        docSnap.data().dueDate
          ? new Date(docSnap.data().dueDate).toLocaleDateString()
          : "No Due Date"
      }</div>
    `;

      const checkbox = taskDiv.querySelector("input");
      checkbox.addEventListener("change", () => {
        taskDiv.classList.add("pop-and-remove");
        setTimeout(() => {
          taskDiv.remove();
          updateDoc(
            doc(db, "users", auth.currentUser.uid, "tasks", docSnap.id),
            {
              completed: true,
              completionDate: new Date().toISOString(),
            }
          );
        }, 300);
        completedTasks++;
        fixProgressBar();
      });

      container.appendChild(taskDiv);
    } else {
      console.log("Task already Completed!");
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const completionDateStr = docSnap.data().completionDate;

      if (completionDateStr) {
        const completionDate = new Date(completionDateStr);
        console.log("Completion Date:", completionDate);
        console.log("7 Days Ago:", sevenDaysAgo);

        // If task is older than 7 days, delete it
        if (completionDate < sevenDaysAgo) {
          deleteDoc(
            doc(db, "users", auth.currentUser.uid, "tasks", docSnap.id)
          );
        } else {
          // It's a completed task, but still within 7 days
          completedTasks++;
          totalTasks++;
        }
      } else {
        // Not completed, so count it as active/incomplete
        totalTasks++;
      }
    }
  });
  console.log(totalTasks);
  console.log(completedTasks);
  document.getElementById("progress-bar").style.transform = `scaleX(${
    completedTasks / totalTasks
  })`;
  document.getElementById("completed-tasks").innerText = completedTasks;
  document.getElementById("total-tasks").innerText = totalTasks;
  if (currentTasks == 0) {
    document.getElementById("no-tasks").style.display = "block";
  } else {
    document.getElementById("no-tasks").style.display = "none";
  }
}

function fixProgressBar() {
  const percent = totalTasks === 0 ? 0 : completedTasks / totalTasks;

  const bar = document.getElementById("progress-bar");
  bar.style.transform = `scaleX(${percent})`; // animate from current to new
  // everything else stays the same
  document.getElementById("completed-tasks").innerText = completedTasks;
  document.getElementById("total-tasks").innerText = totalTasks;

  document.getElementById("no-tasks").style.display =
    currentTasks === 0 ? "block" : "none";
}
