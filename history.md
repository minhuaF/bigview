
## v1

- 实现基本功能

## v2

- 多种布局
- 实现pagelet嵌套
- 生命周期回调

## v3

- 增加3种模式

BigPipe的三种模式：

- 一次渲染模式：即普通模式，支持搜索引擎，用来支持那些不支持JS的客户端。
- 并行
  - 管线模式：即并行模式，并行请求，并即时渲染。(已实现)
  - 并行模式：并行请求，但在获得所有请求的结果后再渲染。