import httpx
import json
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

APP_ID = os.environ.get("FEISHU_APP_ID")
APP_SECRET = os.environ.get("FEISHU_APP_SECRET")
CHAT_ID = os.environ.get("FEISHU_CHAT_ID")


def get_token():
    r = httpx.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": APP_ID, "app_secret": APP_SECRET},
    )
    return r.json()["tenant_access_token"]


def send_text(text: str):
    token = get_token()
    r = httpx.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "receive_id": CHAT_ID,
            "msg_type": "text",
            "content": json.dumps({"text": text}),
        },
    )
    data = r.json()
    if data.get("code") == 0:
        print(f"已发送文字消息到飞书")
    else:
        print(f"发送失败: {data}")
    return data


def send_file(filepath: str):
    filepath = Path(filepath)
    if not filepath.exists():
        print(f"文件不存在: {filepath}")
        return None

    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 上传文件
    with open(filepath, "rb") as f:
        upload = httpx.post(
            "https://open.feishu.cn/open-apis/im/v1/files",
            headers=headers,
            data={"file_type": "stream", "file_name": filepath.name},
            files={"file": (filepath.name, f)},
        )
    upload_data = upload.json()
    if upload_data.get("code") != 0:
        print(f"上传失败: {upload_data}")
        return None

    file_key = upload_data["data"]["file_key"]

    # 发送到群聊
    r = httpx.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "receive_id": CHAT_ID,
            "msg_type": "file",
            "content": json.dumps({"file_key": file_key}),
        },
    )
    data = r.json()
    if data.get("code") == 0:
        print(f"已发送文件到飞书: {filepath.name}")
    else:
        print(f"发送失败: {data}")
    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法:")
        print("  发送文件: python send_to_feishu.py file <文件路径>")
        print("  发送文字: python send_to_feishu.py text <文字内容>")
        sys.exit(1)

    mode = sys.argv[1]
    content = " ".join(sys.argv[2:])

    if mode == "file":
        send_file(content)
    elif mode == "text":
        send_text(content)
    else:
        print(f"未知模式: {mode}")
