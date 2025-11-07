import Bottleneck from "bottleneck"
export const limiter = new Bottleneck({
  minTime: 25,
  maxConcurrent: 1,
})
// 1 member fetch per guild per 1.2 seconds
export const memberFetchLimiter = new Bottleneck.Group({
  minTime: 1200,
  maxConcurrent: 1,
})
// 1 message send per channel per 1.2 seconds
export const sendLimiter = new Bottleneck.Group({
  minTime: 1200,
  maxConcurrent: 1,
})
// 1 role add per 2.2 seconds per guild
export const roleAddLimiter = new Bottleneck.Group({
  minTime: 2200,
  maxConcurrent: 1,
})
// 1 role remove per 2.2 seconds per guild
export const roleRemoveLimiter = new Bottleneck.Group({
  minTime: 2200,
  maxConcurrent: 1,
})
// 1 message fetch per channel per 1.2 seconds
export const messageFetchLimiter = new Bottleneck.Group({
  minTime: 1200,
  maxConcurrent: 1,
})
export const delMessageLimiter = new Bottleneck.Group({
  minTime: 1200,
  maxConcurrent: 1,
})
export const dmLimiter = new Bottleneck.Group({
  minTime: 1200,
  maxConcurrent: 1,
})
