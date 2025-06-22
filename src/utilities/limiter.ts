import Bottleneck from "bottleneck"
const limiter = new Bottleneck({ minTime: 50 })
export default limiter
