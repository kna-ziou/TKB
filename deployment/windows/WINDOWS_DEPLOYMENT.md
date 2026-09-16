# TKB Online Designer — Huong dan van hanh va trien khai Standalone tren Windows 11

Tai lieu nay danh cho quan tri vien / nguoi van hanh ung dung **TKB Online Designer** chay truc tiep tren he dieu hanh Windows 11 (hoac Windows 10) duoi dang may chu doc lap (Standalone Production Server).

---

## 1. Tong quan kien truc Standalone

- **Ma nguon va moi truong phat trien**: Cac thu muc `src/`, `scripts/`, va cac tap tin TypeScript (`.ts`, `.tsx`) la ma nguon phat trien.
- **Moi truong chay thuc te (Runtime)**: Ung dung production duoc bien dich hoan toan vao thu muc `dist/`:
  - `dist/index.html`: Giao dien nguoi dung Single Page Application (SPA).
  - `dist/assets/`: Cac goi JavaScript va CSS da toi uu, hashed va minified.
  - `dist/server.cjs`: May chu Node.js / Express production doc lap, phuc vu file tinh va cac API cuc bo.
- **Luu tru du lieu**: Hoan toan luu tru cuc bo tren trinh duyet nguoi dung (Browser `localStorage`). May chu khong su dung database luu tru du lieu thoi khoa bieu.

---

## 2. Yeu cau he thong (Prerequisites)

1. **He dieu hanh**: Windows 11 (hoac Windows 10 64-bit).
2. **Node.js**: Phien ban LTS >= 20.0.0 (khuyen nghi Node.js v20.x hoac v22.x/v24.x).
   - Kiem tra trong terminal: `node -v`
   - Tai tai: [https://nodejs.org/](https://nodejs.org/)
3. **Git for Windows**:
   - Kiem tra trong terminal: `git --version`
   - Tai tai: [https://git-scm.com/](https://git-scm.com/)

---

## 3. Quy trinh cai dat lan dau (First-Time Setup)

Sau khi clone repository tu GitHub ve may Windows:

```cmd
git clone <URL_REPOSITORY>
cd <THU_MUC_REPOSITORY>
```

Nguoi van hanh chi can chay script:

> **`deployment\windows\setup-tkb.bat`** (Co the click dup chuot truc tiep trong File Explorer)

**Script se tu dong:**
1. Kiem tra su hien dien cua `node` va `npm` (kem phien ban).
2. Chay `npm install` de tai toan bo thu vien can thiet.
3. Chay `npm run build` de bien dich giao dien va may chu vao thu muc `dist/`.
4. Kiem tra tinh toan ven cua cac artifact (`dist/index.html` va `dist/server.cjs`).
5. Thong bao hoan tat va **khong tu dong chay may chu** de ban chu dong quan ly.

---

## 4. Khoi dong may chu Production

De khoi dong may chu:

> **`deployment\windows\start-tkb.bat`** (Click dup chuot trong File Explorer)

**Hanh vi cua script:**
- Dat bien moi truong `NODE_ENV=production`.
- Mac dinh mo cong `3000` (hoac lay theo bien moi truong `PORT` neu duoc thiet lap truoc).
- Chay may chu production bang `npm start` (thuc thi `node dist/server.cjs`).
- Mo mot cua so console tuong tac. May chu se lang nghe tren dia chi `0.0.0.0:3000`.

**Truy cap ung dung:**
- Mo trinh duyet web (Chrome, Edge, Firefox): `http://localhost:3000`

**Chay tren cong tuy chinh (tuy chon):**
Mo Command Prompt:
```cmd
set PORT=3100
deployment\windows\start-tkb.bat
```

---

## 5. Cach dung may chu an toan (Stop Procedure)

Hien tai o Phase 09D, may chu hoat dong duoi che do **Interactive Standalone Server**:
- Khi muon dung may chu, nhan to hop phim **`Ctrl + C`** trong cua so console `start-tkb.bat`.
- He thong se gui tin hieu `SIGINT` toi trinh xu ly dong an toan (Graceful Shutdown Handler) trong `server.cjs`.
- May chu Express se dong ket noi (`server.close()`) va thoat sach se voi ma `0`.
- **Luu y quan trong**: Khong su dung lenh huy diet hang loat nhu `taskkill /f /im node.exe`, vi lenh do se tat ca cac chuong trinh Node.js khac dang chay tren may tinh cua ban.

---

## 6. Kiem tra trang thai may chu (Health Check)

De kiem tra xem may chu co dang hoat dong hay khong:

> **`deployment\windows\check-tkb.bat`** (Click dup chuot trong File Explorer)

Script su dung PowerShell gui yeu cau toi endpoint:
`http://127.0.0.1:3000/api/health`

**Ket qua tra ve:**
- Neu may chu dang chay:
  ```
  ===================================================
   TKB SERVER: ONLINE
  ===================================================
  May chu dang hoat dong binh thuong tai:
     http://localhost:3000
  Endpoint /api/health phan hoi HTTP 200 {"ok":true}
  ===================================================
  ```
- Neu may chu chua chay hoac loi:
  ```
  ===================================================
   TKB SERVER: OFFLINE
  ===================================================
  Khong the ket noi toi may chu tai cong 3000.
  ```

---

## 7. Van hanh tren Localhost (Same-PC Usage)

Khi su dung tai dia chi `http://localhost:3000`:
- Trinh duyet mac dinh xem `localhost` la mot moi truong tin cay (Secure Context dac biet).
- Toan bo tinh nang hoat dong tron ven:
  - Thiet ke, sap xep tiet hoc, tao mon hoc.
  - Luu tru offline vao `localStorage`.
  - In an va Luu PDF ban in kho A4 qua Native Print Dialog cua trinh duyet (`window.print`).
  - Xac thuc va su dung Gemini AI API Key de nhan dang anh thoi khoa bieu.
- **Khong can bat ky chung chi SSL / HTTPS nao** khi chay tren Localhost.

---

## 8. Cho phep cac thiet bi khac trong mang LAN truy cap (Tuy chon)

May chu Express duoc thiet lap lang nghe tren dia chi `0.0.0.0:<PORT>`, nghia la may chu da san sang nhan ket noi tu mang noi bo (LAN).

### Buoc 1: Xac dinh dia chi IP noi bo cua may Windows
Mo Command Prompt va go:
```cmd
ipconfig
```
Tim muc **IPv4 Address** cua card mang Wi-Fi hoac Ethernet dang ket noi (Vi du: `192.168.1.100`).

### Buoc 2: Cau hinh Windows Defender Firewall
Mac dinh, Windows Firewall se chan cac ket noi tu mang ngoai vao cong 3000.
Neu ban muon mo cong cho cac may khac trong nha / truong hoc truy cap:

1. Mo **Command Prompt** hoac **PowerShell** voi quyen **Administrator** (Run as administrator).
2. Chay lenh sau de tao quy tac cho phep (CHI ap dung cho mang `private` noi bo):
   ```cmd
   netsh advfirewall firewall add rule name="TKB Online Designer" dir=in action=allow protocol=TCP localport=3000 profile=private
   ```
3. Cac thiet bi khac trong mang LAN gio day co the truy cap vao:
   `http://192.168.1.100:3000` (thay the bang IP that cua may ban).

### Buoc 3: Xoa quy tac Firewall khi khong con su dung
Neu muon dong cong va xoa quy tac:
```cmd
netsh advfirewall firewall delete rule name="TKB Online Designer"
```

> **Canh bao bao mat Firewall**:
> - KHONG BAO GIO mo cong 3000 tren mang Cong cong (`profile=public`).
> - Cac script BAT cua ung dung khong tu dong can thiep vao Firewall de dam bao quyen kiem soat toi thuong thuoc ve nguoi dung.

---

## 9. Canh bao bao mat ket noi mang noi bo (LAN Security Warning)

Truy cap qua mang LAN bang giao thuc HTTP thong thuong (`http://LAN-IP:3000`) phu hop cho muc dich thu nghiem noi bo, nhung co cac gioi han bao mat can dac biet luu y:

1. **Khong co ma hoa duong truyen (No TLS/HTTPS)**: Du lieu giua trinh duyet tren may client va may chu TKB di qua mang LAN duoi dang plain text khong ma hoa.
2. **Co che truyen API Key khi xac thuc**:
   - Khi nhan dang thoi khoa bieu, trinh duyet goi truc tiep den Google (`generativelanguage.googleapis.com`) qua giao thuc HTTPS bao mat.
   - Tuy nhien, khi nhap va xac thuc API Key, trinh duyet client se gui API Key toi may chu cuc bo qua endpoint `/api/gemini/verify-key`. Neu truy cap qua `http://LAN-IP:3000`, API Key se truyen trong noi bo mang LAN qua HTTP chua ma hoa truoc khi may chu cuc bo goi Google qua HTTPS.
3. **Gioi han Secure Context tren trinh duyet**: Mot so tinh nang trinh duyet yeu cau Secure Context (nhu camera truc tiep) co the bi trinh duyet chan neu khong phai `localhost` va khong co HTTPS.
4. **Ket luan**:
   - Thu nghiem mang LAN: Chap nhan duoc voi mang noi bo tin cay.
   - Trien khai chinh thuc cho nhieu nguoi dung: Bat buoc phai co HTTPS (se duoc ho tro trong PHASE 09E qua Reverse Proxy nhu Nginx / Caddy).

---

## 10. Co che luu tru du lieu (Data Storage Runbook)

Toan bo du lieu thoi khoa bieu cua ung dung duoc luu tru tren trinh duyet cua nguoi dung thong qua Web Storage API (`localStorage`):
- `tkb_online_library_v1`: Danh sach toan bo cac ban ghi thoi khoa bieu da luu.
- `tkb_online_current_doc_id`: ID cua thoi khoa bieu dang mo.
- `tkb-online-designer:v1:library`: Namespace du phong tieu chuan.

**Dac diem quan trong:**
- Du lieu gan lien voi **Profile cua trinh duyet** tren may do.
- Dung trinh duyet khac (Edge thay vi Chrome) tren cung mot may se co thu vien du lieu rieng.
- May tinh khac truy cap vao se co thu vien rieng tren trinh duyet cua may do.
- Xoa du lieu trang web (Clear site data / Clear browsing cache) trong trinh duyet se lam mat thoi khoa bieu chua duoc sao luu.
- **Khuyen nghi van hanh**: Luon su dung tinh nang **Sao luu / Xuat du lieu (Export JSON)** tich hop san trong giao dien truoc khi don dep trinh duyet hoac cap nhat he thong.

---

## 11. Quy trinh Sao luu va Phuc hoi (Backup & Restore Procedure)

Truoc khi thuc hien bat ky thao tac cap nhat ma nguon nao:

1. Mo ung dung tren trinh duyet: `http://localhost:3000`.
2. Vao menu quan ly thoi khoa bieu, chon **Xuat file sao luu (Backup / Export)**.
3. Luu tap tin JSON sao luu vao mot thu muc an toan tren o dia (vi du: `D:\TKB_Backups\`).
4. Dung may chu production (`Ctrl + C` trong cua so `start-tkb.bat`).
5. Chay script cap nhat: `deployment\windows\update-tkb.bat`.
6. Khoi dong lai may chu: `deployment\windows\start-tkb.bat`.
7. Kiem tra thu vien thoi khoa bieu. Trong truong hop can phuc hoi, su dung tinh nang **Nhap file sao luu (Import)** trong giao dien.

*(Luu y: Qua trinh Git pull va bien dich lai khong lam mat du lieu trong `localStorage` cua trinh duyet, nhung sao luu file JSON la quy tac van hanh an toan tieu chuan).*

---

## 12. Quy trinh cap nhat phien ban moi tu GitHub (Update Workflow)

Quy trinh phat trien va cap nhat tieu chuan:
```
Google AI Studio / Git Repository
  │  (Push code moi len GitHub)
  ▼
May tinh Windows trien khai:
  1. Tat may chu dang chay (Ctrl + C)
  2. Chay: deployment\windows\update-tkb.bat
  3. Khoi dong lai: deployment\windows\start-tkb.bat
  4. Kiem tra: deployment\windows\check-tkb.bat
```

**Co che an toan cua `update-tkb.bat`:**
- Kiem tra neu co file bi thay doi cuc bo tren may Windows (`git status --porcelain`). Neu phat hien thay doi chua commit, script se **DUNG LAI NGAY LAP TUC** va khong xoa code cua ban.
- Chi cap nhat bang lenh an toan: `git pull --ff-only` (tuyet doi khong dung `git reset --hard` hay `git clean -fd`).
- Tu dong chay `npm install` va `npm run build` de dong bo ban production moi nhat.

---

## 13. Xu ly cac su co thuong gap (Troubleshooting)

### A. Lỗi: `'git' is not recognized as an internal or external command`
- **Nguyen nhan**: May chua cai Git for Windows hoac chua cau hinh bien moi truong PATH.
- **Khac phuc**: Cai dat Git for Windows tu [https://git-scm.com/](https://git-scm.com/), sau do mo lai Command Prompt.

### B. Lỗi: `'node' is not recognized as an internal or external command`
- **Nguyen nhan**: May chua cai Node.js hoac terminal cu chua nhan PATH moi.
- **Khac phuc**: Cai dat Node.js LTS (>=20) tu [https://nodejs.org/](https://nodejs.org/). Dong tat ca terminal dang mo va mo lai.

### C. Lỗi: `'npm' is not recognized as an internal or external command`
- **Nguyen nhan**: Thuong di kem voi loi Node.js hoac PATH bi thieu thu muc npm.
- **Khac phuc**: Kiem tra bien moi truong PATH, dam bao chua duong dan toi thu muc cai dat Node.js.

### D. Trình duyệt báo `localhost refused to connect`
- **Nguyen nhan**: May chu TKB chua duoc bat hoac da bi tat.
- **Khac phuc**:
  1. Kiem tra xem cua so `start-tkb.bat` co dang mo khong.
  2. Chay `deployment\windows\check-tkb.bat` de xem may chu co online khong.
  3. Kiem tra xem co dang truy cap dung cong (vi du `3000`) khong.

### E. Lỗi: `Port already in use` hoặc `EADDRINUSE: address already in use :::3000`
- **Nguyen nhan**: Mot chuong trinh khac (hoac mot tien trinh TKB cu chua tat han) dang chiem dung cong 3000.
- **Khac phuc**:
  1. Mo Command Prompt va kiem tra tien trinh dang chiem cong:
     ```cmd
     netstat -ano | findstr :3000
     ```
  2. Quan sat cot PID (cot cuoi cung). Mo **Task Manager**, tim PID do va ket thuc tien trinh mot cach chu dong.
  3. Hoac khoi dong TKB tren mot cong khac:
     ```cmd
     set PORT=3001
     deployment\windows\start-tkb.bat
     ```

### F. Lỗi: Thiếu file `dist\server.cjs` khi chạy `start-tkb.bat`
- **Nguyen nhan**: Ung dung chua duoc bien dich production.
- **Khac phuc**: Chay script `deployment\windows\setup-tkb.bat` hoac `deployment\windows\update-tkb.bat`.

### G. `update-tkb.bat` báo: `Phat hien thay doi cuc bo. Khong the cap nhat tu dong.`
- **Nguyen nhan**: Ban da sua truc tiep mot file code trong thu muc trien khai tren may Windows.
- **Khac phuc**:
  - Xem danh sach file bi thay doi bang lenh: `git status`.
  - Neu cac thay doi do khong can thiet, ban co the chu dong huy bo bang Git, sau do chay lai `update-tkb.bat`.

### H. Lỗi nhận dạng AI: `HTTP 503 UNAVAILABLE` hoặc `This model is currently experiencing high demand`
- **Nguyen nhan**: Day la su co qua tai cuc bo tu phia may chu Google Gemini doi voi model duoc yeu cau. Hoan toan khong phai do loi cai dat ung dung hay hong API Key.
- **Khac phuc**:
  - **Khong can cai dat lai ung dung.**
  - **Khong can tao lai API Key.**
  - Cho mot vai phut de he thong Google giam tai va bam "Phan tich thoi khoa bieu" lai.

### I. Lỗi nhận dạng AI: `API Key khong hop le hoac khong co quyen truy cap`
- **Nguyen nhan**: API Key nhap sai, bi thu hoi, hoac Project tren Google Cloud chua kich hoat Generative Language API.
- **Khac phuc**: Vao Google AI Studio ([https://aistudio.google.com/](https://aistudio.google.com/)) de kiem tra lai trang thai API Key cua ban.

### J. Không xuất hiện hộp thoại in ấn (Print Dialog)
- **Nguyen nhan**: Trinh duyet chan popup in hoac ung dung dang bi nhung trong iframe.
- **Khac phuc**:
  - Dam bao ban dang mo ung dung truc tiep tren tab doc lap: `http://localhost:3000`.
  - Kiem tra bieu tuong may in hoac chan popup tren thanh dia chi cua trinh duyet.

---

## 14. Huong dan tao loi tat ngoai Desktop (Desktop Shortcut)

De tien loi cho nguoi van hanh bat/kiem tra ung dung hang ngay:

1. Mo File Explorer, di chuyen vao thu muc `deployment\windows\`.
2. Click chuot phai vao **`start-tkb.bat`** ➔ Chon **Show more options** (tren Windows 11) ➔ Chon **Send to** ➔ **Desktop (create shortcut)**.
3. Click chuot phai vao loi tat vua tao ngoai Desktop, chon **Rename** va doi ten thanh: `Khoi dong TKB Online`.
4. Lam tuong tu cho file **`check-tkb.bat`** de tao loi tat `Kiem tra TKB Online`.

*(Cac script khong can can thiep vao Windows Registry va khong yeu cau quyen Administrator de su dung cac loi tat nay).*

---

## 15. Trang thai he thong ve Windows Service va Tu dong khoi dong (Autostart)

O giai doan **Phase 09D**, ung dung hoat dong duoi co che **Interactive Standalone Console**:
- Nguoi dung khoi dong bang tay khi can su dung.
- Cua so dong lenh se mo trong suot thoi gian may chu hoat dong.
- Tat cua so dong lenh hoac nhan `Ctrl + C` se tat may chu.

**Luu y ve kien truc:**
- He thong **chua tich hop** NSSM, PM2, Task Scheduler autostart hay Windows Service trong giai doan nay.
- Dieu nay giup nguoi van hanh de dang quan sat truc quan log khoi dong, khong gay xung dot tien trinh ngam, va khong can cap quyen Administrator cho he thong.
- Co che Windows Service / PM2 se duoc can nhac danh gia trong cac giai doan tiep theo sau khi he thong hoat dong on dinh.

---

## 16. Mo hinh dong goi (Deployment Packages)

Hien tai co hai mo hinh trien khai san sang cho du an:

### Mo hinh A: Git Working Copy (Khuyen nghi hien tai)
- **Cau truc**: Toan bo repository Git + `node_modules` + `dist/`.
- **Uu diem**: Rat de dang cap nhat bang script `update-tkb.bat`, tu dong dong bo ma nguon moi nhat tu GitHub va bien dich lai nhanh chong.

### Mo hinh B: Minimal Runtime Package (Cho phien ban phat hanh doc lap sau nay)
- **Cau truc**: Chi bao gom:
  - `dist/` (chua toan bo giao dien va `server.cjs`)
  - `package.json` & `package-lock.json`
  - Thu muc `deployment/windows/`
  - Thu vien production cai bang lenh: `npm install --omit=dev`
- **Uu diem**: Khong can luu tru file nguon `src/`, dung luong nhe va phu hop de dong goi file ZIP phat hanh.
