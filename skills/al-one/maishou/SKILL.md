---
name: maishou
description:
  获取商品在淘宝(Taobao)、天猫(TMall)、京东(JD.com)、拼多多(PinDuoDuo)、抖音(Douyin)、快手(KaiShou)的最优价格、优惠券的技能，对比商品价格，当用户想购物或者获取优惠信息时使用。
  Get the best price, coupons for goods on Chinese e-commerce platforms, compare product prices, and use when users want to shop or get discount information.
metadata:
  {
    "openclaw":
      {
        "emoji": "🛍️",
        "requires": {"bins": ["uv"]}
      }
  }
---

# Skill
通过执行Shell命令获取。

```yaml
# 参数解释
source:
  1: 淘宝/天猫
  2: 京东
  3: 拼多多
  7: 抖音
  8: 快手
```

## 搜索商品
```shell
uv run {baseDir}/scripts/main.py search --source={source} --keyword='{keyword}'
uv run {baseDir}/scripts/main.py search --source={source} --keyword='{keyword}' --page=2
```

## 商品详情及购买链接
```shell
uv run {baseDir}/scripts/main.py detail --source={source} --id={goodsId}
```
