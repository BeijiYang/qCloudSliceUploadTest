# 基本概念

[官方产品简介](https://cloud.tencent.com/document/product/436/6222)
* 腾讯云cos服务
* 储存桶bucket
* ...


# 基本功能

主要要实现的功能： 拖拽文件以上传至cos的bucket中指定的文件夹里。

功能拆分：
* 拖拽文件
* 上传文件至bucket
* 指定/创建 bucket中的目标文件夹
* 上传进度条显示
* 删除bucket中的文件
* 重命名bucket中的文件

# 具体实现

## 1. 鉴权操作

### why：
cos中，bucket的权限一般是公有读私有写。对于写操作，必须经过鉴权才能进行。

### how：
* 前端
    * create-react-app + antd
    * [前端 js SDK v5版本](https://cloud.tencent.com/document/product/436/11459#.E5.88.86.E5.9D.97.E4.B8.8A.E4.BC.A0.E4.BB.BB.E5.8A.A1.E6.93.8D.E4.BD.9C)
* 后端
    * node.js
    * Node.js SDK v5版


### 开发准备：
* 注册腾讯云
* [控制台](https://console.cloud.tencent.com/capi)获取 AppId, SecretId, SecretKey
* 针对要操作的bucket进行跨域（CORS）设置
    * 位置：[控制台](https://console.cloud.tencent.com/cos4/index) => bucket列表 => 选定的bucket => 基础配置 => 跨域访问设置
    * 可以参照js-SDK文档默认配置进行操作

### 前端SDK配置：

项目中引入

```
npm install cos-js-sdk-v5 —save
```

调用

对案例代码加以改动

```
// 获取鉴权签名的回调函数
var getAuthorization = function (options, callback) {

    // 方法一，将 COS 操作的 method 和 pathname 传递给服务端，由服务端计算签名返回（推荐）
    axios.post(`${config.api}/auth`, options)
    .then(
      res => {
        const authorization = res.data
        callback(authorization);
      }
    )
    .catch(err => {
        console.log(err)
    })

    // 方法二，直接在前端利用 SecretId 和 SecretKey 计算签名，适合前端调试使用，不提倡在前端暴露 SecretId 和 SecretKey
    /*
    var authorization = COS.getAuthorization({
      SecretId: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      SecretKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      method: (options.method || 'get').toLowerCase(),
      pathname: options.pathname || '/',
    });
    callback(authorization);
    */
};

var params = {
  AppId: 'STRING_VALUE',                                /* 必须 */
  getAuthorization: getAuthorization,                   /* 必须 */
  FileParallelLimit: 'NUMBER',                          /* 非必须 */
  ChunkParallelLimit: 'NUMBER',                         /* 非必须 */
  ChunkSize: 'NUMBER',                                  /* 非必须 */
  ProgressInterval: 'NUMBER',                           /* 非必须 */
  Domain: 'STRING_VALUE',                               /* 非必须 */
};

var cos = new COS(params)
```

注意：
* 方法二仅适合调试使用，可以快速开始体验开发流程
* 与腾讯案例代码不同，与后端交互的方法一，我们使用`axios`
    * 至于为什么直接传option是到后台，打印 `options` 就可以发现，其中包含 ` {method: “方法名", pathname: “/文件名”}`。相当于

    ```
    var method = (options.method || 'get').toLowerCase();
    var pathname = options.pathname || '/';

    let argu = { method, pathname}
    console.log(argu);
    axios.post(`${config.api}/auth`, argu)
    …
    …
    ```

### 后端

npm 引入

```
npm i cos-nodejs-sdk-v5 --save
```

调用：

`auth.js` 中
```
const COS = require('cos-nodejs-sdk-v5')
const config = require('../config/config')

exports.auth = (req, res) => {

  const params = {
    AppId: `${config.AppId}`,
    SecretId: `${config.SecretId}`,
    SecretKey: `${config.SecretKey}`,
    Method: req.body.method,
    Key: req.body.pathname
  }

  const cos = new COS(params)

  const Authorization = cos.getAuth(params)

  res.status(200).json(Authorization)
}
```

#### 注意 这里有个坑：
* 前后端代码的的变量名其实是不统一的
    * 前端的`pathname`对应后端的`Key`
    * 错误的变量名将导致鉴权失败，被腾讯云服务器403拒绝。

类似的，二者参数中，`Region`的格式也不一样，参考[可用地域](https://cloud.tencent.com/document/product/436/6224)。




## 2. 拖拽文件以上传

SDK配置好，现在可以开始功能的开发了。
本节的需求可以分解为
* 拖拽
  * antd的`Dragger`组件
* 上传
  * `js-SDK`的分块上传接口

先看`js-SDK`的`Slice Upload File`接口文档中，对四个必要参数的说明

>操作参数说明
>
>params (Object) ： 参数列表
>
>Bucket —— (String) ： Bucket 名称
>
>Region —— (String) ： Bucket 所在区域。枚举值请见：Bucket 地域信息
>
>Key —— (String) ： Object名称
>
>Body —— (File || Blob) ： 上传文件的内容，可以为File 对象或者 Blob 对象


前三个都好说，重点是第四个**Body**：可以为**File 对象**或者 Blob 对象

### 什么是File对象：
 这是Html5的新特性，详见《Js高程》p689

 照片

 File类型的父类型就是Bold

### 如何得到File对象
  既然要做拖拽上传，就要通过拖拽的方式得到它。

  现在看antd[Upload文档](https://ant.design/components/upload-cn/)的*拖拽上传*部分的实例代码

```
import { Upload, Icon, message } from 'antd';
const Dragger = Upload.Dragger;

const props = {
  name: 'file',
  multiple: true,
  showUploadList: false,
  action: '//jsonplaceholder.typicode.com/posts/',
  onChange(info) {
    const status = info.file.status;
    if (status !== 'uploading') {
      console.log(info.file);
    }
    if (status === 'done') {

    ...  ...

```

试着上传，在第一个if里，将console.log的内容改为仅打印info.file。在console中可以发现，info.file里，有个属性：originFileObj。它就是我们想要的File对象。
在`props`的参数`action: ''`中，填入无效的上传地址。由此，`status !== 'uploading'`我们能直接进入回调onChange()函数。

在onChange()函数中，我们可以调用JS-SDK的上传接口

```
onChange(info) {
  const status = info.file.status;
  if (status !== 'uploading') {
    //尝试在回调中引入cos-js-sdk 分块上传
    var params = {
      Bucket: `${config.Bucket}`,
      Region: `${config.Region}`,
      Key: `${that.state.folder}${file.name}`,
      Body: file,  
    };
    cos.sliceUploadFile(params, function(err, data) {
      if(err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });
    //cos-js-sdk 分块上传 结束
  }
}
```
就可以实现文件的拖拽上传了。
