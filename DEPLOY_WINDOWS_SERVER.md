# Windows Server 2025 内网部署操作手册

这份文档按“不会写代码也能照着做”的方式写。你明天到公司服务器后，按顺序一步一步来即可。

## 0. 最终访问方式

部署完成后，公司局域网用户访问：

```text
http://服务器内网IP
```

整体结构是：

```text
局域网浏览器
  -> Nginx 80端口
  -> 前端页面 dist
  -> /api 转发到 Node 后端 127.0.0.1:3001
  -> MySQL 127.0.0.1:3306
```

## 1. 需要安装的软件

在 Windows Server 2025 上安装：

1. Node.js LTS
2. MySQL Server 8.x
3. Nginx for Windows

建议项目放在：

```text
C:\apps\Project-FundingManagement
```

如果你放在别的目录，后面 Nginx 配置里的路径也要一起改。

## 2. 从笔记本打包

从笔记本复制整个项目目录到服务器，但不要复制这些目录或文件：

```text
node_modules
backend\node_modules
dist
backend\.env
backend\data
.git
.DS_Store
```

原因：

- `node_modules` 到服务器后重新安装
- `dist` 到服务器后重新打包生成
- `backend\.env` 是每台机器自己的密码配置，不要从笔记本带过去
- `backend\data` 是本地临时测试数据，服务器正式数据放 MySQL

必须确认这些文件在包里：

```text
src\App.vue
package.json
package-lock.json
vite.config.ts
backend\package.json
backend\package-lock.json
backend\.env.example
backend\schema.sql
backend\src\server.js
backend\src\auth.js
backend\src\db.js
backend\src\password.js
backend\src\storage.js
backend\src\scripts\init-db.js
deploy\nginx\funding-management.conf
DEPLOY_WINDOWS_SERVER.md
```

## 3. 创建 MySQL 数据库

打开 MySQL Workbench，或者 MySQL 命令行，用 root 登录。

执行下面 SQL。注意把 `请改成强密码` 换成你自己的 MySQL 应用账号密码。

```sql
CREATE DATABASE IF NOT EXISTS funding_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'funding_app'@'127.0.0.1' IDENTIFIED BY '请改成强密码';
GRANT ALL PRIVILEGES ON funding_management.* TO 'funding_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

记住这个密码，下一步要填到 `backend\.env` 里。

## 4. 配置后端密码文件

进入：

```text
C:\apps\Project-FundingManagement\backend
```

复制：

```text
.env.example
```

粘贴并改名为：

```text
.env
```

然后打开 `backend\.env`，按下面这样填：

```env
NODE_ENV=production
STORAGE_DRIVER=mysql
HOST=127.0.0.1
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=funding_app
DB_PASSWORD=第3步设置的MySQL应用账号密码
DB_NAME=funding_management

JWT_SECRET=至少32位随机字符串，比如 FundingManagement2026LocalOnlySecret
JWT_EXPIRES_HOURS=12

ADMIN_USERNAME=admin
ADMIN_PASSWORD=你设置的管理员密码
VISITOR_USERNAME=visitor
VISITOR_PASSWORD=你设置的访客密码
```

说明：

- 管理员账号默认可以叫 `admin`
- 访客账号默认可以叫 `visitor`
- 密码你自己定，建议至少 8 位
- `JWT_SECRET` 不需要记住，但必须够长，不要太简单
- 服务器正式部署必须使用 `STORAGE_DRIVER=mysql`

## 5. 安装依赖

打开 Windows 命令提示符或 PowerShell。

进入项目根目录：

```bat
cd /d C:\apps\Project-FundingManagement
```

安装前端依赖：

```bat
npm install
```

进入后端目录：

```bat
cd backend
```

安装后端依赖：

```bat
npm install
```

## 6. 初始化数据库账号

仍然在 `backend` 目录里执行：

```bat
npm run init-db
```

成功时会看到类似：

```text
User ready: admin (admin)
User ready: visitor (visitor)
Database initialized.
```

如果报错，优先检查：

- `backend\.env` 是否存在
- `DB_PASSWORD` 是否是第 3 步设置的密码
- MySQL 服务是否正在运行
- `JWT_SECRET` 是否至少 32 位
- `ADMIN_PASSWORD` 和 `VISITOR_PASSWORD` 是否已填写

## 7. 打包前端

回到项目根目录：

```bat
cd /d C:\apps\Project-FundingManagement
```

执行：

```bat
npm run build
```

成功后会生成：

```text
C:\apps\Project-FundingManagement\dist
```

## 8. 启动后端

进入后端目录：

```bat
cd /d C:\apps\Project-FundingManagement\backend
```

启动：

```bat
npm start
```

看到类似下面内容，说明后端启动成功：

```text
Funding Management server listening on http://127.0.0.1:3001
```

先不要关这个窗口。关掉窗口，后端就停了。

第一天可以先这样跑。后续如果要长期运行，再配置 Windows 服务或 PM2。

## 9. 配置 Nginx

项目里已经准备好模板：

```text
C:\apps\Project-FundingManagement\deploy\nginx\funding-management.conf
```

复制到 Nginx 配置目录，例如：

```text
C:\nginx\conf\conf.d\funding-management.conf
```

如果没有 `conf.d` 文件夹，就手动新建。

打开：

```text
C:\nginx\conf\nginx.conf
```

确认 `http { ... }` 里面有这一行：

```nginx
include conf.d/*.conf;
```

如果没有，就加进去。

然后检查模板里的前端路径是否正确：

```nginx
root C:/apps/Project-FundingManagement/dist;
```

如果你的项目不是放在 `C:\apps\Project-FundingManagement`，这里要改成实际路径，注意 Nginx 配置里用 `/`，不要用 `\`。

检查 Nginx 配置：

```bat
cd /d C:\nginx
nginx.exe -t
```

如果显示 `successful`，启动 Nginx：

```bat
nginx.exe
```

## 10. 浏览器验证

在服务器本机浏览器打开：

```text
http://127.0.0.1
```

在公司局域网电脑打开：

```text
http://服务器内网IP
```

用你在 `backend\.env` 里设置的账号登录：

```text
管理员：admin / 你设置的管理员密码
访客：visitor / 你设置的访客密码
```

## 11. 权限说明

管理员可以：

- 查看
- 新增
- 编辑
- 删除
- 导入
- 导出
- 字典维护
- 清空数据
- 重置示例数据

访客只能：

- 查看
- 筛选
- 导出

访客不能：

- 新增
- 编辑
- 删除
- 导入
- 字典维护
- 清空数据
- 重置数据

## 12. 手机端说明

当前前端保留了原来的手机端适配：

- 手机端有侧边栏收起/展开
- 筛选区会自动换行
- 统计卡片和表单会按小屏布局显示
- 登录页也支持手机屏幕居中显示

部署方式不影响手机适配。手机只要连公司局域网，访问：

```text
http://服务器内网IP
```

即可打开。

## 13. Windows 防火墙建议

建议只对局域网开放：

```text
TCP 80
```

不要对局域网开放：

```text
TCP 3001
TCP 3306
```

解释：

- 80 是 Nginx 给用户访问的入口
- 3001 是 Node 后端，只让服务器本机访问
- 3306 是 MySQL，只让服务器本机访问

## 14. 每周备份 MySQL

可以用 Windows 任务计划程序，每周执行一次备份。

示例批处理文件 `backup-mysql.bat`：

```bat
@echo off
set BACKUP_DIR=D:\backup\funding-management
set MYSQLDUMP="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
set DATE_STR=%date:~0,4%-%date:~5,2%-%date:~8,2%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

%MYSQLDUMP% -h 127.0.0.1 -u funding_app -p你的MySQL应用账号密码 funding_management > %BACKUP_DIR%\funding_management_%DATE_STR%.sql
```

建议：

- 每周备份一次
- 每次大批量导入前手动备份一次
- 保留最近 8 份备份

## 15. 常见问题

### 登录失败

检查：

1. `backend\.env` 是否填写了 `ADMIN_PASSWORD` 和 `VISITOR_PASSWORD`
2. 是否执行过 `npm run init-db`
3. 后端窗口是否正在运行 `npm start`
4. MySQL 服务是否正在运行
5. Nginx 是否把 `/api` 转发到了 `127.0.0.1:3001`

### 打开页面空白

检查：

1. 是否执行过 `npm run build`
2. `dist` 目录是否存在
3. Nginx 配置里的 `root` 路径是否正确
4. 是否执行过 `nginx.exe -t`

### 页面能打开，但登录接口失败

检查：

1. 后端是否启动
2. `backend\.env` 里的 `HOST=127.0.0.1`、`PORT=3001`
3. Nginx 配置里的 `proxy_pass http://127.0.0.1:3001/api/;`

### 局域网其他电脑打不开

检查：

1. 服务器内网 IP 是否正确
2. Windows 防火墙是否开放 TCP 80
3. Nginx 是否启动
4. 服务器和访问电脑是否在同一局域网

## 16. 后续更新版本

以后你在笔记本上改好代码后，到服务器更新：

1. 替换项目代码
2. 不要覆盖服务器上的 `backend\.env`
3. 项目根目录执行 `npm install`
4. `backend` 目录执行 `npm install`
5. 项目根目录执行 `npm run build`
6. 重启后端 `npm start`
7. 如果 Nginx 配置没变，通常不用重启 Nginx
