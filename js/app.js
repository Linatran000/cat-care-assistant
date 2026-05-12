document.addEventListener('DOMContentLoaded', () => {
  const AppConfig = {
    toastTimeout: null,
    notificationSimInterval: null
  };
  // --- UI Elements ---
  const views = {
    onboarding: document.getElementById('onboarding-view'),
    dashboard: document.getElementById('dashboard-view')
  };
  const onboardingForm = document.getElementById('onboarding-form');
  const taskListEl = document.getElementById('task-list');
  const taskCountEl = document.getElementById('task-count');
  const displayCatName = document.getElementById('display-cat-name');
  const moodBtns = document.querySelectorAll('.mood-btn');
  const toastContainer = document.getElementById('toast-container');
  // --- Routing & Initialization ---
  function init() {
    const profile = StorageBox.getProfile();
    if (profile) {
      showDashboard(profile);
    } else {
      showView('onboarding');
    }
  }
  function showView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
  }
  // --- Onboarding Logic ---
  onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    const breed = document.getElementById('cat-breed').value;
    const age = parseInt(document.getElementById('cat-age').value);
    const weight = parseFloat(document.getElementById('cat-weight').value);
    // Calculate rules
    const mealsPerDay = age < 6 ? 4 : (age < 12 ? 3 : 2);
    const gramsPerMeal = Math.round((weight * 20) / mealsPerDay + 10); // Dummy logic
    const profile = { name, breed, ageMonths: age, weightKg: weight, mealsPerDay, gramsPerMeal };
    StorageBox.saveProfile(profile);
    
    // Create initial tasks
    generateDailyTasks(profile);
    showToast('Tạo hồ sơ thành công!', 'success');
  
    setTimeout(() => {
        showDashboard(profile);
    }, 1000);
  });
  // --- Dashboard Logic ---
  function showDashboard(profile) {
    showView('dashboard');
    displayCatName.textContent = `${profile.name} đang chờ bạn`;
    
    // Sync current mood UI
    const logs = StorageBox.getLogs();
    if(logs.length > 0) {
      const lastMood = logs[logs.length-1].state;
      moodBtns.forEach(b => {
        if(b.dataset.mood === lastMood) b.classList.add('active');
        else b.classList.remove('active');
      });
    }
    renderTasks();
    startNotificationEngine();
  }
  // --- Task Generation & Rendering ---
  function generateDailyTasks(profile) {
    const today = StorageBox.getTodayString();
    const currentTasks = StorageBox.getTasks();
    
    // Check if we already generated tasks for today
    if (currentTasks.some(t => t.date === today)) return;
    let newTasks = [];
    
    // 1. Feeding tasks
    const feedTimes = profile.mealsPerDay === 4 ? ['07:00','12:00','18:00','22:00'] :
                      profile.mealsPerDay === 3 ? ['07:00','13:00','19:00'] :
                      ['07:30', '19:30'];
                      
    feedTimes.forEach((time, index) => {
       newTasks.push({
           id: StorageBox.generateId(),
           title: `Cho ${profile.name} ăn (${profile.gramsPerMeal}g)`,
           type: 'feeding',
           scheduledTime: time,
           date: today,
           status: 'pending',
           requiredBehavior: 'any',
           remindCount: 0
       });
    });
    // 2. Hygiene (e.g., Cắt móng - scheduled arbitrarily for demo at 19:00)
    newTasks.push({
        id: StorageBox.generateId(),
        title: `Vệ sinh & Chải lông ${profile.name}`,
        type: 'hygiene',
        scheduledTime: '20:00',
        date: today,
        status: 'pending',
        requiredBehavior: 'calm',
        remindCount: 0
    });
    StorageBox.saveTasks([...currentTasks, ...newTasks]);
  }
  function renderTasks() {
    const todayTasks = StorageBox.getTasksToday();
    
    // Sort tasks string time
    todayTasks.sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime));
    
    taskListEl.innerHTML = '';
    
    let doneTasks = 0;
    
    if (todayTasks.length === 0) {
        taskListEl.innerHTML = `
           <div class="empty-state">
              <i class="fa-regular fa-face-smile-wink"></i>
              <p>Mèo đã được chăm sóc đầy đủ hôm nay!</p>
           </div>
        `;
    } else {
      todayTasks.forEach(task => {
        if(task.status === 'done') doneTasks++;
        
        const el = document.createElement('div');
        el.className = `task-item type-${task.type} status-${task.status}`;
        
        let actionsHtml = '';
        if (task.status !== 'done') {
            actionsHtml = `
              <div class="task-actions">
                <button class="action-btn btn-snooze" data-id="${task.id}" title="Dời lại 1h"><i class="fa-solid fa-clock-rotate-left"></i></button>
                <button class="action-btn btn-done" data-id="${task.id}" title="Đã xong"><i class="fa-solid fa-check"></i></button>
              </div>
            `;
        }
        el.innerHTML = `
          <div class="task-info">
            <div class="task-time"><i class="fa-regular fa-clock"></i> ${task.scheduledTime}</div>
            <div class="task-title">${task.title}</div>
          </div>
          ${actionsHtml}
        `;
        taskListEl.appendChild(el);
      });
    }
    taskCountEl.textContent = `${doneTasks}/${todayTasks.length}`;
    bindTaskEvents();
  }
  function bindTaskEvents() {
    document.querySelectorAll('.btn-done').forEach(btn => {
       btn.addEventListener('click', (e) => {
           const id = btn.dataset.id;
           const targetTask = StorageBox.getTasksToday().find(t => t.id === id);
           
           if(targetTask.requiredBehavior === 'calm' && !StorageBox.isCatCalm()) {
               showToast('Mèo đang stress, hãy hoãn lại task này!', 'error');
               return;
           }
           
           StorageBox.updateTask(id, {status: 'done'});
           showToast('Đã hoàn thành! 🐱', 'success');
           renderTasks();
       });
    });
    document.querySelectorAll('.btn-snooze').forEach(btn => {
       btn.addEventListener('click', (e) => {
           const id = btn.dataset.id;
           const sCount = StorageBox.incrementTaskSnooze(id);
           if(sCount > 3) {
             showToast('Không thể dời thêm (đã quá 3 lần)!', 'warning');
           } else {
             showToast('Đã dời lịch thêm 1 tiếng', 'info');
             renderTasks();
           }
       });
    });
  }
  // --- Behavior Engine ---
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mood = btn.dataset.mood;
      StorageBox.addLog(mood);
      
      if(mood === 'fearful' || mood === 'avoidant') {
        showToast('Gợi ý: Mèo đang stress! Hãy tạo chỗ ẩn nấp, giảm tiếng ồn.', 'warning');
      } else {
        showToast('Mèo đang khá ổn!', 'success');
      }
    });
  });
  // --- Toast Simulator ---
  function showToast(msg, type='info') {
    const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark'};
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
       <i class="toast-icon fa-solid ${icons[type]}"></i>
       <div class="toast-msg">${msg}</div>
    `;
    toastContainer.prepend(toast);
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  // --- Background Notification Engine ---
  function startNotificationEngine() {
      if(AppConfig.notificationSimInterval) clearInterval(AppConfig.notificationSimInterval);
      
      AppConfig.notificationSimInterval = setInterval(() => {
          const d = new Date();
          const currentHour = d.getHours();
          // Rule Cấm làm phiền 22h-6h
          if (currentHour >= 22 || currentHour < 6) return;
          const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          
          const tasks = StorageBox.getTasksToday().filter(t => t.status === 'pending');
          const dueTask = tasks.find(t => t.scheduledTime === hm);
          
          if(dueTask) {
              showToast(`Đã đến giờ: ${dueTask.title}`, 'info');
          }
      }, 30000); // Check every 30 seconds for the demo
  }
  // Khởi động app
  init();
});
