const $ = (selector) => document.querySelector(selector);
const STORAGE = {
  tasks: "taskrirang_v2_tasks",
  projects: "taskrirang_v2_projects",
  memories: "taskrirang_v2_memories",
  messages: "taskrirang_v2_messages", settings: "taskrirang_v2_settings", profile: "taskrirang_v2_profile", profiles: "taskrirang_v2_profiles"
};

function readStore(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}
let tasks = readStore(STORAGE.tasks);
let projects = readStore(STORAGE.projects);
if (!localStorage.getItem(STORAGE.projects)) {
  projects = [
    {id:"sample-1",name:"Ciencias naturales: ecosistemas",student:"Valentina R.",fileName:"Presentación · Grado 7°",savedAt:"2026-10-23T08:42:00",image:"https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80",description:"Presentación sobre ecosistemas, biodiversidad y relaciones entre los seres vivos.",sample:true},
    {id:"sample-2",name:"Lectura y análisis literario",student:"Samuel M.",fileName:"Informe · Grado 8°",savedAt:"2026-10-22T14:18:00",image:"https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",description:"Análisis de lectura con tema central, personajes e interpretación personal.",sample:true},
    {id:"sample-3",name:"Matemáticas en la vida diaria",student:"Isabella P.",fileName:"Taller · Grado 9°",savedAt:"2026-10-21T10:06:00",image:"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",description:"Ejercicios que relacionan conceptos matemáticos con situaciones cotidianas.",sample:true}
  ]; localStorage.setItem(STORAGE.projects, JSON.stringify(projects));
} else { projects = projects.filter(p => !(p.sample && /por favor/i.test(p.name || ""))); localStorage.setItem(STORAGE.projects, JSON.stringify(projects)); }

let memories = readStore(STORAGE.memories);
let messages = readStore(STORAGE.messages);
function readObject(key, fallback) { try { const v=JSON.parse(localStorage.getItem(key)||"null"); return v&&typeof v==="object"&&!Array.isArray(v)?{...fallback,...v}:{...fallback}; } catch { return {...fallback}; } }
function saveObject(key,data) { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch { toast("No se pudo guardar. Prueba con una imagen más pequeña."); return false; } }
let settings = readObject(STORAGE.settings,{theme:"light",font:"trebuchet",fontSize:100,language:"es",toasts:true,dueAlerts:true,browserNotifications:false});
const defaultProfiles = { Emily: {name:"Emily",role:"Profesor",email:"",details:"",photo:""}, Dulce: {name:"Dulce",role:"Profesor",email:"",details:"",photo:""} };
let profiles = readObject(STORAGE.profiles, defaultProfiles);
if (!localStorage.getItem(STORAGE.profiles)) { const oldProfile=readObject(STORAGE.profile,defaultProfiles.Emily); profiles.Emily={...defaultProfiles.Emily,...oldProfile,name:"Emily",role:"Profesor"}; saveObject(STORAGE.profiles,profiles); }
let activeProfileName = localStorage.getItem("taskrirang_active_profile") === "Dulce" ? "Dulce" : "Emily";
let profile = {...defaultProfiles[activeProfileName], ...(profiles[activeProfileName] || {})};
let filter = "todas";
let editingId = null;
let sortDescending = false;
let taskImageData = "";
let memoryImageData = "";

function saveStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    toast("El almacenamiento está lleno. Prueba con una imagen más pequeña.");
    return false;
  }
}
function toast(message) {
  if (settings && settings.toasts === false) return;
  const el = $("#toast");
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.style.display = "none", 3000);
}
function safeDate(date) {
  if (!date) return "Sin fecha";
  const parts = date.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric"
  });
}
function makeButton(text, title, callback, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.title = title;
  button.setAttribute("aria-label", title);
  if (className) button.className = className;
  button.addEventListener("click", callback);
  return button;
}
function readImage(file, callback) {
  if (!file) { callback(""); return; }
  if (!file.type.startsWith("image/")) {
    toast("Selecciona un archivo de imagen.");
    callback("");
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    toast("La imagen supera 1,5 MB. Elige una imagen más pequeña para guardarla.");
    callback("");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result));
  reader.onerror = () => toast("No se pudo leer la imagen.");
  reader.readAsDataURL(file);
}

// FECHA ACTUAL
$("#todayDate").textContent = new Date().toLocaleDateString("es-CO", {
  day: "2-digit", month: "2-digit", year: "2-digit"
});

// RECUERDOS: elegir foto, escribir título y guardarlo en este navegador.
$("#memoryImage").addEventListener("change", event => {
  readImage(event.target.files[0], data => {
    memoryImageData = data;
    if (data) {
      $("#memoryPreview").src = data;
      $("#memoryPreview").classList.remove("hidden");
      $("#memoryPlaceholder").classList.add("hidden");
    }
  });
});
$("#saveMemory").addEventListener("click", () => {
  const caption = $("#memoryCaption").value.trim();
  if (!memoryImageData) {
    toast("Primero selecciona una foto para tu recuerdo.");
    return;
  }
  memories.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    caption: caption || "Mi recuerdo",
    image: memoryImageData,
    created: new Date().toISOString()
  });
  if (!saveStore(STORAGE.memories, memories)) {
    memories.shift();
    return;
  }
  $("#memoryImage").value = "";
  $("#memoryCaption").value = "";
  $("#memoryPreview").removeAttribute("src");
  $("#memoryPreview").classList.add("hidden");
  $("#memoryPlaceholder").classList.remove("hidden");
  memoryImageData = "";
  renderMemories();
  toast("¡Recuerdo guardado!");
});
function renderMemories() {
  const gallery = $("#memoryGallery");
  gallery.replaceChildren();
  memories.forEach(memory => {
    const entry = document.createElement("div");
    entry.className = "memory-entry";
    const image = document.createElement("img");
    image.src = memory.image;
    image.alt = memory.caption;
    const text = document.createElement("div");
    text.textContent = memory.caption;
    const remove = makeButton("×", "Eliminar recuerdo", () => {
      memories = memories.filter(item => item.id !== memory.id);
      saveStore(STORAGE.memories, memories);
      renderMemories();
    });
    entry.append(image, text, remove);
    gallery.append(entry);
  });
}

// MENSAJES: notas locales, no mensajes recibidos desde otras aplicaciones.
$("#messageForm").addEventListener("submit", event => {
  event.preventDefault();
  const author = $("#messageAuthor").value.trim() || "Anónimo";
  const text = $("#messageText").value.trim();
  if (!text) return;
  messages.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    author, text, created: new Date().toISOString()
  });
  if (!saveStore(STORAGE.messages, messages)) {
    messages.shift();
    return;
  }
  $("#messageForm").reset();
  renderMessages();
  toast("Mensaje guardado en tu espacio.");
});
function renderMessages() {
  const list = $("#messageList");
  list.replaceChildren();
  messages.forEach(message => {
    const note = document.createElement("article");
    note.className = "message-note";
    const author = document.createElement("b");
    author.textContent = message.author + " · " + new Date(message.created).toLocaleDateString("es-CO");
    const body = document.createElement("p");
    body.textContent = message.text;
    const remove = makeButton("×", "Eliminar mensaje", () => {
      messages = messages.filter(item => item.id !== message.id);
      saveStore(STORAGE.messages, messages);
      renderMessages();
    });
    note.append(author, body, remove);
    list.append(note);
  });
}

// PROYECTOS: permite registrar un archivo seleccionado. El archivo se enlaza para abrirlo
// durante la sesión; los nombres de los proyectos quedan guardados localmente.
$("#addProjectButton").addEventListener("click", () => $("#projectForm").classList.toggle("hidden"));
$("#closeProjectForm").addEventListener("click", () => $("#projectForm").classList.add("hidden"));
$("#projectForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#projectName").value.trim();
  const file = $("#projectFile").files[0];
  projects.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    student: "Entrega registrada",
    fileName: file ? file.name : "Sin archivo adjunto",
    fileSize: file ? file.size : 0,
    savedAt: new Date().toISOString(),
    description: "Proyecto registrado desde el panel docente."
  });
  if (!saveStore(STORAGE.projects, projects)) {
    projects.shift();
    return;
  }
  // Los navegadores no permiten reabrir automáticamente archivos locales después
  // de cerrar la sesión. Se conserva el nombre; se debe seleccionar el archivo otra vez.
  $("#projectForm").reset();
  $("#projectForm").classList.add("hidden");
  renderProjects();
  toast(file ? "Proyecto registrado. Selecciona el archivo otra vez si necesitas abrirlo después." : "Proyecto guardado.");
});
function renderProjects() {
  const grid = $("#projectGrid"); grid.replaceChildren();
  if (!projects.length) { const empty=document.createElement("div"); empty.className="project-placeholder"; empty.textContent="No hay proyectos todavía. Pulsa «Nuevo proyecto» para añadir uno."; grid.append(empty); return; }
  projects.forEach(project => {
    const card=document.createElement("button"); card.type="button"; card.className="project-card project-card-button"; card.setAttribute("aria-label",`Abrir carpeta ${project.name}`);
    const img=document.createElement("img"); img.className="project-card-image"; img.alt=`Imagen: ${project.name}`; img.src=project.image||"https://images.unsplash.com/photo-1455390582262-044c163a3c4e?auto=format&fit=crop&w=900&q=80"; img.onerror=()=>{img.style.display="none";};
    const title=document.createElement("h3"); title.textContent=project.name;
    const student=document.createElement("p"); student.className="project-student"; student.textContent=project.student||"Entrega de estudiante";
    const file=document.createElement("p"); file.textContent=project.fileName||"Sin archivo adjunto";
    const date=document.createElement("p"); date.className="project-date"; date.textContent=`Entregado: ${new Date(project.savedAt).toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"})}`;
    const hint=document.createElement("span"); hint.className="open-folder-hint"; hint.textContent="Abrir carpeta →";
    card.append(img,title,student,file,date,hint); card.addEventListener("click",()=>openProjectFolder(project));
    const remove=makeButton("×","Eliminar proyecto",()=>{projects=projects.filter(item=>item.id!==project.id);saveStore(STORAGE.projects,projects);renderProjects();},"project-delete");
    const wrap=document.createElement("div"); wrap.className="project-card-wrap"; wrap.append(card,remove); grid.append(wrap);
  });
}
function openProjectFolder(project) {
  $("#projectDetailTitle").textContent=project.name; $("#projectDetailStudent").textContent=project.student||"Entrega de estudiante"; $("#projectDetailFile").textContent=project.fileName||"Sin archivo adjunto";
  $("#projectDetailDate").textContent=new Date(project.savedAt).toLocaleString("es-CO",{dateStyle:"full",timeStyle:"short"}); $("#projectDetailStatus").textContent=project.sample?"Ejemplo de demostración":"Recibido en esta página";
  $("#projectDetailDescription").textContent=project.description||"Carpeta de entrega del estudiante.";
  const img=$("#projectDetailImage"); img.src=project.image||"https://images.unsplash.com/photo-1455390582262-044c163a3c4e?auto=format&fit=crop&w=1200&q=80"; img.alt=`Imagen del proyecto ${project.name}`; img.style.display="block"; img.onerror=()=>{img.style.display="none";}; $("#projectDetailModal").classList.remove("hidden");
}

// TAREAS: formulario, imagen opcional, estado, filtros, búsqueda y orden por fecha.
function openTaskForm(task = null) {
  editingId = task ? task.id : null;
  taskImageData = task?.image || "";
  $("#taskFormTitle").textContent = task ? "Editar tarea" : "Nueva tarea";
  $("#taskName").value = task?.name || "";
  $("#taskDate").value = task?.date || "";
  $("#taskPriority").value = task?.priority || "Normal";
  $("#taskNotes").value = task?.notes || "";
  $("#taskImage").value = "";
  if (taskImageData) {
    $("#taskImagePreview").src = taskImageData;
    $("#taskImagePreviewWrap").classList.remove("hidden");
  } else {
    $("#taskImagePreviewWrap").classList.add("hidden");
    $("#taskImagePreview").removeAttribute("src");
  }
  $("#taskForm").classList.remove("hidden");
  $("#taskName").focus();
}
function closeTaskForm() {
  $("#taskForm").reset();
  $("#taskForm").classList.add("hidden");
  editingId = null;
  taskImageData = "";
}
$("#addTaskButton").addEventListener("click", () => openTaskForm());
$("#addTaskTop").addEventListener("click", () => openTaskForm());
$("#cancelTask").addEventListener("click", closeTaskForm);
$("#cancelTaskBottom").addEventListener("click", closeTaskForm);
$("#taskImage").addEventListener("change", event => {
  const file = event.target.files[0];
  readImage(file, data => {
    if (!data) return;
    taskImageData = data;
    $("#taskImagePreview").src = data;
    $("#taskImagePreviewWrap").classList.remove("hidden");
  });
});
$("#removeTaskImage").addEventListener("click", () => {
  taskImageData = "";
  $("#taskImage").value = "";
  $("#taskImagePreview").removeAttribute("src");
  $("#taskImagePreviewWrap").classList.add("hidden");
});
$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#taskName").value.trim();
  const date = $("#taskDate").value;
  if (!name || !date) {
    toast("Completa el nombre y la fecha de entrega.");
    return;
  }
  if (editingId) {
    const task = tasks.find(item => item.id === editingId);
    if (task) Object.assign(task, {
      name, date, priority: $("#taskPriority").value,
      notes: $("#taskNotes").value.trim(), image: taskImageData
    });
  } else {
    tasks.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name, date, priority: $("#taskPriority").value,
      notes: $("#taskNotes").value.trim(), image: taskImageData,
      completed: false, createdAt: new Date().toISOString()
    });
  }
  if (!saveStore(STORAGE.tasks, tasks)) return;
  closeTaskForm();
  renderTasks();
  toast(editingId ? "Tarea actualizada." : "Tarea guardada.");
});

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task || !confirm(`¿Quieres eliminar "${task.name}"?`)) return;
  tasks = tasks.filter(item => item.id !== id);
  saveStore(STORAGE.tasks, tasks);
  renderTasks();
  toast("Tarea eliminada.");
}
function renderTasks() {
  const search = $("#taskSearch").value.trim().toLowerCase();
  const global = $("#globalSearch").value.trim().toLowerCase();
  const query = search || global;
  const visible = tasks.filter(task => {
    const matchesFilter = filter === "todas" ||
      (filter === "pendiente" && !task.completed) ||
      (filter === "completada" && task.completed);
    const matchesQuery = !query ||
      task.name.toLowerCase().includes(query) ||
      task.notes.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  }).sort((a, b) => {
    const order = a.date.localeCompare(b.date);
    return sortDescending ? -order : order;
  });

  const list = $("#taskList");
  list.replaceChildren();
  visible.forEach(task => {
    const article = document.createElement("article");
    article.className = "task-item" + (task.completed ? " is-done" : "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Marcar como completada");
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveStore(STORAGE.tasks, tasks);
      renderTasks();
    });

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("strong");
    title.textContent = task.name;
    const date = document.createElement("p");
    date.textContent = "Vence: " + safeDate(task.date);
    const notes = document.createElement("p");
    notes.textContent = task.notes || "Sin descripción adicional";
    const status = document.createElement("span");
    status.className = "status " + (task.completed ? "done" : "pending");
    status.textContent = task.completed ? "✓ Completada" : "◉ Pendiente";
    const priority = document.createElement("span");
    priority.className = "priority";
    priority.textContent = "Prioridad: " + task.priority;
    main.append(title, date, notes, status, priority);
    if (task.image) {
      const img = document.createElement("img");
      img.className = "task-thumb";
      img.src = task.image;
      img.alt = "Imagen adjunta a " + task.name;
      main.append(img);
    }
    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      makeButton("✎", "Editar tarea", () => openTaskForm(task)),
      makeButton("×", "Eliminar tarea", () => deleteTask(task.id))
    );
    article.append(checkbox, main, actions);
    list.append(article);
  });

  $("#emptyTasks").classList.toggle("hidden", visible.length > 0);
  $("#allCount").textContent = tasks.length;
  $("#pendingCount").textContent = tasks.filter(t => !t.completed).length;
  $("#doneCount").textContent = tasks.filter(t => t.completed).length;
  $("#taskSummary").textContent = `${tasks.length} tarea${tasks.length === 1 ? "" : "s"} guardada${tasks.length === 1 ? "" : "s"}`;
}
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    const headings = { todas: "Mis tareas", pendiente: "Notas pendientes", completada: "Notas completadas" };
    $("#taskHeading").textContent = headings[filter];
    renderTasks();
  });
});
$("#taskSearch").addEventListener("input", renderTasks);
$("#globalSearch").addEventListener("input", renderTasks);
$("#sortButton").addEventListener("click", () => {
  sortDescending = !sortDescending;
  renderTasks();
  toast(sortDescending ? "Orden: fecha más lejana primero." : "Orden: fecha más próxima primero.");
});
$("#messagesJump").addEventListener("click", () => $("#messagesSection").scrollIntoView({ behavior: "smooth", block: "center" }));
// Perfiles docentes: Emily y Dulce
let profilePhotoData = profile.photo || "";
function saveActiveProfile(){profiles[activeProfileName]={...profile,name:activeProfileName,role:"Profesor"};saveObject(STORAGE.profiles,profiles);localStorage.setItem("taskrirang_active_profile",activeProfileName);}
function applyProfile(){profile={...defaultProfiles[activeProfileName],...(profiles[activeProfileName]||profile),name:activeProfileName,role:"Profesor"};profilePhotoData=profile.photo||"";$("#headerProfileName").textContent=activeProfileName;$("#headerProfileRole").textContent="Profesor";[$("#headerProfileImage"),$("#profilePhotoPreview")].forEach(img=>{if(profilePhotoData){img.src=profilePhotoData;img.classList.add("has-photo");}else{img.removeAttribute("src");img.classList.remove("has-photo");}});$("#profileName").value=activeProfileName;$("#profileRole").value="Profesor";$("#profileEmail").value=profile.email||"";$("#profileDetails").value=profile.details||"";$("#profileSwitcher").value=activeProfileName;}
$("#profileButton").addEventListener("click",()=>{applyProfile();$("#profileModal").classList.remove("hidden");});
$("#profileSwitcher").addEventListener("change",e=>{saveActiveProfile();activeProfileName=e.target.value;localStorage.setItem("taskrirang_active_profile",activeProfileName);profile={...defaultProfiles[activeProfileName],...(profiles[activeProfileName]||{})};applyProfile();});
$("#profilePhoto").addEventListener("change",e=>readImage(e.target.files[0],data=>{if(data){profilePhotoData=data;$("#profilePhotoPreview").src=data;$("#profilePhotoPreview").classList.add("has-photo");}}));
$("#profileForm").addEventListener("submit",e=>{e.preventDefault();profile={...profile,name:activeProfileName,role:"Profesor",email:$("#profileEmail").value.trim(),details:$("#profileDetails").value.trim(),photo:profilePhotoData};profiles[activeProfileName]=profile;if(!saveObject(STORAGE.profiles,profiles))return;saveActiveProfile();applyProfile();$("#profileModal").classList.add("hidden");toast(`Perfil de ${activeProfileName} guardado.`);});
// Configuración
function applySettings(){document.body.classList.toggle("dark-theme",settings.theme==="dark");document.documentElement.style.setProperty("--user-font-size",`${settings.fontSize||100}%`);const fonts={trebuchet:'"Trebuchet MS", Arial, sans-serif',arial:'Arial, sans-serif',georgia:'Georgia, serif',verdana:'Verdana, sans-serif'};document.documentElement.style.setProperty("--user-font",fonts[settings.font]||fonts.trebuchet);document.documentElement.lang=settings.language||"es";$("#settingTheme").value=settings.theme||"light";$("#settingFont").value=settings.font||"trebuchet";$("#settingFontSize").value=settings.fontSize||100;$("#fontSizeLabel").textContent=`${settings.fontSize||100}%`;$("#settingLanguage").value=settings.language||"es";$("#settingToasts").checked=settings.toasts!==false;$("#settingDueAlerts").checked=settings.dueAlerts!==false;$("#settingBrowserNotifications").checked=settings.browserNotifications===true;}
$("#settingsButton").addEventListener("click",()=>{applySettings();$("#settingsModal").classList.remove("hidden");});
$("#settingTheme").addEventListener("change",e=>{settings.theme=e.target.value;applySettings();});
$("#settingFont").addEventListener("change",e=>{settings.font=e.target.value;applySettings();});
$("#settingFontSize").addEventListener("input",e=>{settings.fontSize=Number(e.target.value);applySettings();});
$("#settingLanguage").addEventListener("change",e=>{settings.language=e.target.value;applySettings();toast(settings.language==="en"?"English selected. Some labels remain in Spanish.":"Idioma seleccionado: español.");});
$("#saveSettings").addEventListener("click",async()=>{settings.toasts=$("#settingToasts").checked;settings.dueAlerts=$("#settingDueAlerts").checked;const wants=$("#settingBrowserNotifications").checked;if(wants&&"Notification" in window&&Notification.permission==="default")settings.browserNotifications=(await Notification.requestPermission())==="granted";else settings.browserNotifications=!!(wants&&"Notification" in window&&Notification.permission==="granted");saveObject(STORAGE.settings,settings);$("#settingsModal").classList.add("hidden");toast("Configuración guardada.");});
$("#resetSettings").addEventListener("click",()=>{settings={theme:"light",font:"trebuchet",fontSize:100,language:"es",toasts:true,dueAlerts:true,browserNotifications:false};applySettings();saveObject(STORAGE.settings,settings);toast("Configuración restablecida.");});
document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.closeModal).classList.add("hidden")));
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));
function showDueTaskAlerts(){if(settings.dueAlerts===false)return;const today=new Date();today.setHours(0,0,0,0);const soon=tasks.filter(t=>!t.completed&&t.date).filter(t=>{const d=new Date(t.date+"T00:00:00");const days=Math.round((d-today)/86400000);return days>=0&&days<=2;});if(!soon.length)return;const msg=soon.length===1?`Aviso: “${soon[0].name}” vence pronto.`:`Aviso: tienes ${soon.length} tareas que vencen en los próximos 2 días.`;setTimeout(()=>toast(msg),700);if(settings.browserNotifications&&"Notification" in window&&Notification.permission==="granted")new Notification("TASKRIRANG · Recordatorio",{body:msg});}
// Render inicial
applySettings();applyProfile();renderMemories();renderMessages();renderProjects();renderTasks();showDueTaskAlerts();
