let re = /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/
let string = ''
let a = '?*'
let b = '水电费'
let c = 'sdfls?djf'
let d = 'sdf_sdf'
console.log(re.test(string))
console.log(re.test(a))
console.log(re.test(b))
console.log(re.test(c))
console.log(re.test(d))
// console.log(re.test(string))
// console.log(re.test(string))
