#!/bin/bash

# ==============================================================================
# md2pdf-local.sh
# 描述: 离线版 Markdown 转 PDF (自动缓存 Emoji 到本地)
# 核心: Pandoc + WeasyPrint + Local Emoji Cache (from npmmirror)
# ==============================================================================

set -e

# --- 配置项 ---
# 缓存目录
CACHE_DIR="$HOME/.cache/md2pdf"
EMOJI_DIR="$CACHE_DIR/emojis"
# 镜像源地址 (emoji-datasource-google 15.0.0 版本)
MIRROR_URL="https://registry.npmmirror.com/emoji-datasource-google/-/emoji-datasource-google-15.0.0.tgz"

# --- 检查参数 ---
if [ "$#" -ne 2 ]; then
    echo "用法: $0 <input.md> <output.pdf>"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="$2"
TEMP_DIR=$(mktemp -d)
HTML_TEMP="$TEMP_DIR/temp.html"
LUA_FILTER="$TEMP_DIR/emoji_local.lua"
CSS_STYLE="$TEMP_DIR/style.css"

# --- 清理函数 ---
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# --- 1. 检查并下载 Emoji 资源 (只需执行一次) ---
ensure_emojis() {
    if [ -d "$EMOJI_DIR" ] && [ "$(ls -A $EMOJI_DIR)" ]; then
        return 0
    fi

    echo "🚧 检测到本地 Emoji 缺失，正在通过国内镜像下载..."
    mkdir -p "$CACHE_DIR"

    # 下载 tgz 包
    wget -O "$CACHE_DIR/emojis.tgz" "$MIRROR_URL"

    # 解压 (只提取 64px 的 Google 风格图片)
    # 注意：npm 包结构通常是 package/img/google/64/
    echo "📦 正在解压资源..."
    tar -xzf "$CACHE_DIR/emojis.tgz" -C "$CACHE_DIR" "package/img/google/64/"

    # 移动到最终目录并清理
    mv "$CACHE_DIR/package/img/google/64" "$EMOJI_DIR"
    rm -rf "$CACHE_DIR/package" "$CACHE_DIR/emojis.tgz"

    echo "✅ Emoji 资源已缓存至: $EMOJI_DIR"
}

ensure_emojis

# --- 2. 生成可用 Emoji 列表 ---
# 创建一个包含所有可用 emoji hex 码的文件
find "$EMOJI_DIR" -type f -name "*.png" -exec basename {} .png \; | sort > "$TEMP_DIR/available_emojis.txt"

# --- 3. 生成 Lua Filter (指向本地文件，检查文件存在性) ---
# 这里我们需要将 Shell 变量传递给 Lua，或者直接在 Lua 中硬编码路径
# 为了安全，我们通过 sed 替换路径
cat << 'EOF' > "$LUA_FILTER.tpl"
-- 读取可用 emoji 列表
local available_emojis_file = io.open("AVAILABLE_EMOJIS_FILE", "r")
local available_emojis = {}

if available_emojis_file then
    for line in available_emojis_file:lines() do
        available_emojis[line] = true
    end
    available_emojis_file:close()
end

function Str(el)
  local new_inlines = {}
  local text = el.text
  local emoji_path = "EMOJI_DIR_PLACEHOLDER"

  for p, c in utf8.codes(text) do
    local is_emoji = false

    -- 简单的 Emoji 范围检测
    if (c >= 0x1F600 and c <= 0x1F64F) or -- Emoticons
       (c >= 0x1F300 and c <= 0x1F5FF) or -- Misc Symbols and Pictographs
       (c >= 0x1F680 and c <= 0x1F6FF) or -- Transport and Map
       (c >= 0x1F900 and c <= 0x1F9FF) or -- Supplemental Symbols and Pictographs
       (c >= 0x2600 and c <= 0x26FF) or   -- Misc Symbols
       (c >= 0x2700 and c <= 0x27BF) then -- Dingbats
       is_emoji = true
    end

    if is_emoji then
      -- emoji-datasource 文件名为小写 hex (例如 1f600.png)
      local hex = string.format("%x", c)

      -- 检查 emoji 是否在可用列表中
      if available_emojis[hex] then
          -- 构建本地 file:// 路径
          -- 注意：WeasyPrint 需要绝对路径
          local url = "file://" .. emoji_path .. "/" .. hex .. ".png"

          local img_html = '<img src="' .. url .. '" class="emoji" alt="' .. utf8.char(c) .. '">'
          table.insert(new_inlines, pandoc.RawInline('html', img_html))
      else
          -- Emoji 不存在，显示为 Unicode 字符
          table.insert(new_inlines, pandoc.Str(utf8.char(c)))
      end
    else
      table.insert(new_inlines, pandoc.Str(utf8.char(c)))
    end
  end

  if #new_inlines > 0 then
    return new_inlines
  else
    return nil
  end
end
EOF

# 替换 Lua 模板中的路径占位符
sed -e "s|EMOJI_DIR_PLACEHOLDER|$EMOJI_DIR|g" \
    -e "s|AVAILABLE_EMOJIS_FILE|$TEMP_DIR/available_emojis.txt|g" \
    "$LUA_FILTER.tpl" > "$LUA_FILTER"

# --- 4. 生成 CSS 样式 ---
cat << 'EOF' > "$CSS_STYLE"
@page {
    size: A4;
    margin: 2.5cm;
    @bottom-center {
        content: "Page " counter(page);
        font-family: "Noto Sans SC";
        font-size: 9pt;
        color: #888;
    }
}

body {
    font-family: "AR PL UMing CN", "AR PL SungtiL GB", "AR PL KaitiM GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    font-size: 11pt;
    color: #333;
}

/* Emoji 样式：本地图片通常不需要太大调整，但保持垂直居中 */
img.emoji {
    height: 1.1em;
    width: 1.1em;
    vertical-align: -0.2em;
    display: inline-block;
    margin: 0 0.05em;
}

h1, h2, h3 {
    font-family: "AR PL UMing CN", "AR PL SungtiL GB", "AR PL KaitiM GB", "Noto Sans SC", sans-serif;
    font-weight: bold;
    color: #2c3e50;
}
h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: "Menlo", "Monaco", monospace; }
pre { background-color: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; }
blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #777; font-style: italic; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f8f9fa; }
EOF

# --- 5. 执行转换 ---

echo "📝 正在处理 Markdown (使用本地 Emoji)..."
pandoc "$INPUT_FILE" \
    --lua-filter="$LUA_FILTER" \
    --css="$CSS_STYLE" \
    --metadata title=" " \
    --standalone \
    -o "$HTML_TEMP"

echo "🖨️  正在生成 PDF..."
weasyprint "$HTML_TEMP" "$OUTPUT_FILE"

echo "✨ 转换成功: $OUTPUT_FILE"
