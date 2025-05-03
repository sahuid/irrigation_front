@echo off
echo ================================================
echo         灌溉系统 WebSocket 服务器启动脚本
echo ================================================
echo.

:: 创建logs目录
if not exist "logs" mkdir logs

:: 检查WebSocket服务器是否已经在运行
echo [信息] 检查WebSocket服务器是否已经在运行...
node check-websocket.js >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [警告] WebSocket服务器已经在运行
    echo.
    choice /C YN /M "是否重新启动服务器？ (Y=是, N=否)"
    if %ERRORLEVEL% EQU 2 (
        echo [信息] 操作已取消
        pause
        exit /b 0
    )
    
    echo [信息] 正在重新启动服务器...
    :: 这里可以添加强制关闭之前的服务器的代码
)

:: 设置启动日志文件
set LOGFILE=logs\websocket-server-startup-%date:~0,4%-%date:~5,2%-%date:~8,2%.log

:: 启动WebSocket服务器
echo [信息] 正在启动WebSocket服务器...
echo.
echo 服务器输出将重定向到日志文件: %LOGFILE%
echo 您可以使用 Ctrl+C 组合键终止服务器
echo.
echo 服务器启动中，请稍候...
echo.

:: 启动服务器并重定向输出到日志文件
node websocket-server.js > %LOGFILE% 2>&1

:: 如果服务器退出，显示消息
echo.
echo [信息] WebSocket服务器已停止运行
echo 如果这是意外终止，请检查日志文件: %LOGFILE%
echo.
pause 