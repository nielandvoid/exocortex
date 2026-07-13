// does nothing. dont ask
function playClickSound() {}

// win drag & dorp
let highestZ = 10;
const windows = document.querySelectorAll('.window');
const initialReadmeContent = document.querySelector('#window-about .notepad-textarea')?.value || '';

function makeDraggable(win) {
  const titlebar = win.querySelector('.window-titlebar');
  if (!titlebar) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initX = 0, initY = 0;

  titlebar.addEventListener('pointerdown', (e) => {
    // if click, dont drag
    if (e.target.closest('.win-btn')) return;

    // focus window
    focusWindow(win);
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    initX = win.offsetLeft;
    initY = win.offsetTop;
    
    titlebar.setPointerCapture(e.pointerId);
  });

  titlebar.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // bounds limit
    let newX = initX + dx;
    let newY = initY + dy;
    
    // cant escape upwards. sideways tho? ur free
    if (newY < 0) newY = 0;
    
    win.style.left = `${newX}px`;
    win.style.top = `${newY}px`;
  });

  titlebar.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    win.dataset.dragged = "true";
    titlebar.releasePointerCapture(e.pointerId);
  });
}

function focusWindow(win) {
  if (win.classList.contains('active-window')) return;
  
  // z-index goes brrr
  highestZ += 2;
  win.style.zIndex = highestZ;
  
  windows.forEach(w => {
    w.classList.remove('active-window');
    w.classList.add('inactive-window');
  });
  
  win.classList.add('active-window');
  win.classList.remove('inactive-window');
  
  
  updateTaskbarActiveTab(win.id);
}

function activateNextWindow() {
  const visibleWindows = Array.from(windows).filter(w => w.style.display !== 'none');
  if (visibleWindows.length === 0) {
    updateTaskbarActiveTab(null);
    return;
  }
  
  visibleWindows.sort((a, b) => {
    const zA = parseInt(a.style.zIndex) || 0;
    const zB = parseInt(b.style.zIndex) || 0;
    return zB - zA;
  });
  
  focusWindow(visibleWindows[0]);
}

windows.forEach(win => {
  makeDraggable(win);
  win.addEventListener('pointerdown', () => {
    focusWindow(win);
  });
});

// win control logic 
windows.forEach(win => {
  const closeBtn = win.querySelector('.win-btn-close');
  const minBtn = win.querySelector('.win-btn-minimize');
  const maxBtn = win.querySelector('.win-btn-maximize');

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playClickSound();
      win.style.display = 'none';
      removeTaskbarTab(win.id);
      activateNextWindow();
    });
  }

  if (minBtn) {
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playClickSound('minimize');
      win.style.display = 'none';
      win.classList.remove('active-window');
      activateNextWindow();
    });
  }

  if (maxBtn) {
    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playClickSound('maximize');
      
      if (win.style.width === '100vw') {
        
        win.style.width = win.dataset.preWidth || '400px';
        win.style.height = win.dataset.preHeight || '300px';
        win.style.top = win.dataset.preTop || '80px';
        win.style.left = win.dataset.preLeft || '100px';
      } else {
      
        win.dataset.preWidth = win.style.width;
        win.dataset.preHeight = win.style.height;
        win.dataset.preTop = win.style.top;
        win.dataset.preLeft = win.style.left;
        
        win.style.width = '100vw';
        win.style.height = 'calc(100vh - 28px)';
        win.style.top = '0px';
        win.style.left = '0px';
      }
    });
  }
});

// desktop icon init
let cascadeOffset = 0;
const icons = document.querySelectorAll('.icon');
icons.forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    icons.forEach(i => i.classList.remove('selected'));
    icon.classList.add('selected');
  });

    // dblclick open / restore
  icon.addEventListener('dblclick', () => {
    icons.forEach(i => i.classList.remove('selected'));
    const targetId = icon.dataset.target;
    const win = document.getElementById(targetId);
    if (win) {
      playClickSound('maximize');
      win.style.display = 'flex';
      focusWindow(win);
      
      
      if (targetId === 'window-about') {
        const textarea = win.querySelector('.notepad-textarea');
        if (textarea) {
          textarea.value = initialReadmeContent;
        }
        const titlebarText = win.querySelector('.titlebar-text');
        if (titlebarText) {
          titlebarText.textContent = 'readme.txt - Notepad';
        }
      }
      
      // cascading
      if (!win.dataset.dragged) {
        if (win.id === 'window-calendar') {
          const winWidth = win.offsetWidth || 350;
          const winHeight = win.offsetHeight || 280;
          win.style.left = `${Math.round((window.innerWidth - winWidth) / 2)}px`;
          win.style.top = `${Math.round((window.innerHeight - 28 - winHeight) / 2)}px`;
        } else {
          const startX = 50;
          const startY = 50;
          const offset = cascadeOffset * 20;
          win.style.left = `${startX + offset}px`;
          win.style.top = `${startY + offset}px`;
          cascadeOffset = (cascadeOffset + 1) % 6;
        }
      }
      
      createTaskbarTab(targetId, win.querySelector('.titlebar-text').textContent);
    }
  });
});

document.addEventListener('click', () => {
  icons.forEach(i => i.classList.remove('selected'));
});

// # taskabr rendering and stuff
const taskbarTabsContainer = document.getElementById('taskbar-tabs-container');
const openTabs = {};

function createTaskbarTab(winId, title) {
  if (openTabs[winId]) return; // Already exists
  
  const tab = document.createElement('button');
  tab.className = 'taskbar-tab outset-panel';
  tab.id = `tab-${winId}`;
  tab.textContent = title;
  
  tab.addEventListener('click', () => {
    const win = document.getElementById(winId);
    if (!win) return;
    
    if (win.style.display === 'none') {
      playClickSound('maximize');
      win.style.display = 'flex';
      focusWindow(win);
    } else if (win.classList.contains('active-window')) {
      playClickSound('minimize');
      win.style.display = 'none';
      win.classList.remove('active-window');
      updateTaskbarActiveTab(null);
    } else {
      playClickSound();
      focusWindow(win);
    }
  });
  
  taskbarTabsContainer.appendChild(tab);
  openTabs[winId] = tab;
  updateTaskbarActiveTab(winId);
}

function removeTaskbarTab(winId) {
  const tab = openTabs[winId];
  if (tab) {
    tab.remove();
    delete openTabs[winId];
  }
}

function updateTaskbarActiveTab(activeWinId) {
  Object.keys(openTabs).forEach(id => {
    const tab = openTabs[id];
    if (id === activeWinId) {
      tab.classList.add('active-tab');
      tab.classList.remove('outset-panel');
    } else {
      tab.classList.remove('active-tab');
      tab.classList.add('outset-panel');
    }
  });
}

// initial tabs for currently visible windows
window.addEventListener('DOMContentLoaded', () => {
  windows.forEach(win => {
    if (win.style.display !== 'none') {
      createTaskbarTab(win.id, win.querySelector('.titlebar-text').textContent);
    }
  });

  if (typeof renderExplorer === 'function') {
    renderExplorer();
  }
  
  // add clock / calender click handlers 
  const calendarEl = document.getElementById('systray-calendar');
  const clockEl = document.getElementById('systray-clock');
  
  const openCalendarWindow = () => {
    const win = document.getElementById('window-calendar');
    if (win) {
      playClickSound('maximize');
      win.style.display = 'flex';
      focusWindow(win);
      
      // center prop. win
      if (!win.dataset.dragged) {
        const winWidth = win.offsetWidth || 350;
        const winHeight = win.offsetHeight || 280;
        win.style.left = `${Math.round((window.innerWidth - winWidth) / 2)}px`;
        win.style.top = `${Math.round((window.innerHeight - 28 - winHeight) / 2)}px`;
      }
      
      populateCalendar();
      createTaskbarTab('window-calendar', 'Date/Time Properties');
    }
  };

  if (calendarEl) {
    calendarEl.addEventListener('click', openCalendarWindow);
  }
  if (clockEl) {
    clockEl.addEventListener('click', openCalendarWindow);
  }

  
  const okBtn = document.getElementById('calendar-ok-btn');
  const cancelBtn = document.getElementById('calendar-cancel-btn');
  const calendarWin = document.getElementById('window-calendar');
  if (okBtn && calendarWin) {
    okBtn.addEventListener('click', () => {
      playClickSound();
      calendarWin.style.display = 'none';
      removeTaskbarTab('window-calendar');
      activateNextWindow();
    });
  }
  if (cancelBtn && calendarWin) {
    cancelBtn.addEventListener('click', () => {
      playClickSound();
      calendarWin.style.display = 'none';
      removeTaskbarTab('window-calendar');
      activateNextWindow();
    });
  }
  
  updateClock();
  setInterval(updateClock, 1000);
});

// sys clock utility
function updateClock() {
  const clockEl = document.getElementById('systray-clock');
  const calendarEl = document.getElementById('systray-calendar');
  if (!clockEl) return;
  
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  clockEl.textContent = `${hours}:${minutes} ${ampm}`;
  
  // date format
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = now.toLocaleDateString(undefined, dateOptions);
  
  clockEl.title = dateString;
  if (calendarEl) {
    calendarEl.title = dateString;
  }

  
  const calendarClockDisplay = document.getElementById('calendar-clock-display');
  if (calendarClockDisplay) {
    const secs = String(now.getSeconds()).padStart(2, '0');
    calendarClockDisplay.textContent = `${hours}:${minutes}:${secs} ${ampm}`;
  }
}

function populateCalendar() {
  const daysGrid = document.getElementById('calendar-days-grid');
  const monthYearEl = document.getElementById('calendar-month-year');
  const dateDisplayEl = document.getElementById('calendar-date-display');
  if (!daysGrid || !monthYearEl) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const today = now.getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  monthYearEl.textContent = `${monthNames[month]} ${year}`;

  const dateOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  if (dateDisplayEl) {
    dateDisplayEl.textContent = now.toLocaleDateString(undefined, dateOptions);
  }

  
  daysGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  
  const totalDays = new Date(year, month + 1, 0).getDate();

  
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('span');
    daysGrid.appendChild(emptyCell);
  }


  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement('span');
    dayCell.textContent = day;
    dayCell.style.padding = "2px";
    dayCell.style.cursor = "default";
    
    if (day === today) {
      dayCell.style.backgroundColor = "#000080";
      dayCell.style.color = "white";
      dayCell.style.fontWeight = "bold";
      dayCell.style.borderRadius = "2px";
    }
    
    daysGrid.appendChild(dayCell);
  }
}

// startmenu trigger // action logic
const startBtn = document.querySelector('.start-btn');
const startMenu = document.getElementById('start-menu');

if (startBtn && startMenu) {
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playClickSound('maximize');
    
    // toggle
    if (startMenu.style.display === 'none') {
      startMenu.style.display = 'flex';
      startBtn.style.borderStyle = 'inset';
    } else {
      startMenu.style.display = 'none';
      startBtn.style.borderStyle = '';
    }
  });

  
  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
      startMenu.style.display = 'none';
      startBtn.style.borderStyle = '';
    }
  });

  startMenu.querySelectorAll('.start-menu-item[data-target]').forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      const win = document.getElementById(targetId);
      if (win) {
        playClickSound('maximize');
        win.style.display = 'flex';
        focusWindow(win);
        
        // calendar populate
        if (targetId === 'window-calendar') {
          populateCalendar();
        }
        
        // cascading
        if (!win.dataset.dragged) {
          if (win.id === 'window-calendar') {
            const winWidth = win.offsetWidth || 350;
            const winHeight = win.offsetHeight || 280;
            win.style.left = `${Math.round((window.innerWidth - winWidth) / 2)}px`;
            win.style.top = `${Math.round((window.innerHeight - 28 - winHeight) / 2)}px`;
          } else {
            const startX = 50;
            const startY = 50;
            const offset = cascadeOffset * 20;
            win.style.left = `${startX + offset}px`;
            win.style.top = `${startY + offset}px`;
            cascadeOffset = (cascadeOffset + 1) % 6;
          }
        }
        
        createTaskbarTab(targetId, win.querySelector('.titlebar-text').textContent);
      }
      startMenu.style.display = 'none';
      startBtn.style.borderStyle = '';
    });
  });

  // shutdown esteregg 
  const shutdownBtn = document.getElementById('menu-shutdown');
  if (shutdownBtn) {
    shutdownBtn.addEventListener('click', () => {
      playClickSound();
      startMenu.style.display = 'none';
      startBtn.style.borderStyle = '';
      
      // modern browser dialog on a 98 desktop. the irony
      const confirmShutdown = confirm("are you sure you want to shut down exocortex?");
      if (confirmShutdown) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'black';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.color = '#c0c0c0';
        overlay.style.fontFamily = "'MS Sans Serif', sans-serif";
        overlay.style.fontSize = '12px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 2s ease-in-out';
        
        overlay.innerHTML = `
          <div style="text-align: center;">
             <p style="font-weight: bold; font-size: 15px; margin-bottom: 20px; color: #c0c0c0; font-family: monospace;">it's now safe to turn off your computer.</p>
             <button class="action-btn" id="restart-sys-btn" style="padding: 4px 16px; font-weight: bold;">Restart</button>
          </div>
        `;
        document.body.appendChild(overlay);
        
        setTimeout(() => {
          overlay.style.opacity = '1';
        }, 50);
        
        overlay.querySelector('#restart-sys-btn').addEventListener('click', () => {
          window.location.reload(); // technically accurate
        });
      }
    });
  }
}

// my_computer file routing
const VIRTUAL_FS = {
  name: "My Computer",
  type: "dir",
  contents: {
    "3½ Floppy (A:)": {
      name: "3½ Floppy (A:)",
      type: "dir",
      iconClass: "icon-floppy",
      contents: {}
    },
    "Hard Disk (C:)": {
      name: "Hard Disk (C:)",
      type: "dir",
      iconClass: "icon-disk",
      contents: {
        "projects": {
          name: "projects",
          type: "dir",
          iconClass: "icon-folder",
          contents: {
            "oasis": {
              name: "oasis",
              type: "link",
              url: "https://github.com/nielandvoid/oasis",
              iconClass: "icon-folder",
              contents: {}
            },
            "peerprojectin": {
              name: "peerprojectin",
              type: "dir",
              iconClass: "icon-folder",
              contents: {
                "src": {
                  name: "src",
                  type: "link",
                  url: "https://github.com/nielandvoid/peerprojectin",
                  iconClass: "icon-folder",
                  contents: {}
                },
                "readme_tpp.txt": {
                  name: "readme_tpp.txt",
                  type: "file",
                  iconClass: "file-txt",
                  content: "free // student-run // non-profit peer-to-peer mentorship initiative." // inception levels of nesting
                }
              }
            }
          }
        }
      }
    },
    "Audio CD (D:)": {
      name: "Audio CD (D:)",
      type: "dir",
      iconClass: "icon-cdrom",
      contents: {}
    },
    "Control Panel": {
      name: "Control Panel",
      type: "dir",
      iconClass: "icon-control-panel",
      contents: {}
    }
  }
};

let explorerPath = ["My Computer"];

const explorerPane = document.getElementById('explorer-pane');
const explorerAddress = document.getElementById('explorer-address');
const explorerBackBtn = document.getElementById('explorer-back-btn');
const explorerStatus = document.getElementById('explorer-status');

function getDirectoryByPath(pathArr) {
  let current = VIRTUAL_FS;
  for (let i = 1; i < pathArr.length; i++) {
    if (current && current.contents && current.contents[pathArr[i]]) {
      current = current.contents[pathArr[i]];
    } else {
      return null;
    }
  }
  return current;
}

function renderExplorer() {
  if (!explorerPane) return;
  
  const currentDir = getDirectoryByPath(explorerPath);
  explorerPane.innerHTML = "";
  
  if (!currentDir || !currentDir.contents) {
    explorerStatus.textContent = "0 object(s)";
    return;
  }
  
  const items = Object.keys(currentDir.contents);
  explorerStatus.textContent = `${items.length} object(s)`;
  
  items.forEach(name => {
    const item = currentDir.contents[name];
    const itemEl = document.createElement('div');
    itemEl.className = "explorer-item";
    itemEl.setAttribute('data-name', name);
    
    const iconClass = item.iconClass || "icon-folder";
    
    itemEl.innerHTML = `
      <div class="explorer-item-icon ${iconClass}"></div>
      <div class="explorer-item-label">${name}</div>
    `;
    
    
    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.explorer-item').forEach(el => el.classList.remove('selected'));
      itemEl.classList.add('selected');
    });
    
    
    itemEl.addEventListener('dblclick', () => {
      if (item.type === 'link' && item.url) {
        playClickSound();
        window.open(item.url, '_blank');
      } else if (item.type === 'dir') {
        playClickSound();
        explorerPath.push(name);
        renderExplorer();
      } else if (item.type === 'file') {
        playClickSound();
        const aboutWin = document.getElementById('window-about');
        if (aboutWin) {
          aboutWin.style.display = 'flex';
          focusWindow(aboutWin);
          
          const textarea = aboutWin.querySelector('.notepad-textarea');
          if (textarea) {
            textarea.value = item.content || "";
          }
          
          const titlebarText = aboutWin.querySelector('.titlebar-text');
          if (titlebarText) {
            titlebarText.textContent = `${name} - Notepad`;
          }
          
          createTaskbarTab('window-about', `${name} - Notepad`);
        }
      }
    });
    
    explorerPane.appendChild(itemEl);
  });
  
  
  explorerAddress.value = explorerPath.join(" \\ ");
  if (explorerPath.length > 1) {
    explorerBackBtn.removeAttribute('disabled');
  } else {
    explorerBackBtn.setAttribute('disabled', 'true');
  }
}

if (explorerPane) {
  explorerPane.addEventListener('click', () => {
    document.querySelectorAll('.explorer-item').forEach(el => el.classList.remove('selected'));
  });
}

// back button nav
if (explorerBackBtn) {
  explorerBackBtn.addEventListener('click', () => {
    if (explorerPath.length > 1) {
      playClickSound();
      explorerPath.pop();
      renderExplorer();
    }
  });
}

// address bar nav
if (explorerAddress) {
  explorerAddress.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const inputPath = explorerAddress.value.trim();
      
      // parse path
      const parsedParts = inputPath
        .split(/[\\/]/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
        
      if (parsedParts.length === 0) {
        renderExplorer();
        return;
      }
      
      // must start w/ my computer
      if (parsedParts[0].toLowerCase() !== "my computer") {
        // yes this is a website pretending to be windows. cope
        alert(`Windows cannot find '${inputPath}'. Make sure you typed the name correctly, and then try again.`);
        renderExplorer();
        return;
      }
      
      // fix casing
      parsedParts[0] = "My Computer";
      
      // resolve
      const targetDir = getDirectoryByPath(parsedParts);
      if (targetDir && targetDir.type === 'dir') {
        playClickSound();
        explorerPath = parsedParts;
        renderExplorer();
      } else {
        alert(`Windows cannot find '${inputPath}'. Make sure you typed the name correctly, and then try again.`);
        renderExplorer();
      }
    }
  });
}

const contextMenu = document.getElementById('desktop-context-menu');
const refreshItem = document.getElementById('context-refresh');
const desktopEl = document.querySelector('.desktop');

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.icon')) {
    contextMenu.style.display = 'none';
    return;
  }
  
  if (e.target === desktopEl || e.target.closest('.desktop-icons')) {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
  } else {
    contextMenu.style.display = 'none';
  }
});

document.addEventListener('click', () => {
  contextMenu.style.display = 'none';
}, { capture: true });

refreshItem.addEventListener('click', () => {
  window.location.reload();
});
