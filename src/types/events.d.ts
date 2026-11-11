export {}

/**
 * 小程序 / uni-app 的输入、picker、slider 等事件对象携带 detail 字段，
 * 而 DOM 的 Event 类型没有。这里做一次全局补充，让模板中的 $event.detail 通过严格类型检查。
 */
declare global {
  interface Event {
    detail: {
      value?: any
      [key: string]: any
    }
  }
}
