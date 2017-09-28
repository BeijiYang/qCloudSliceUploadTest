import React, { Component } from 'react'
import axios from 'axios'
import config from '../config'
import { Layout, Breadcrumb, Icon, Table, Upload,message ,Progress, Input, Button, Modal,Form} from 'antd'
import COS from 'cos-js-sdk-v5'
// import TableColumns from './tableColumns'
import moment from 'moment'
// import CollectionsPage from './renameModal'
// import CollectionCreateForm from './renameModal'
const Dragger = Upload.Dragger
const confirm = Modal.confirm
const FormItem = Form.Item


//腾讯cos js-sdk配置
// 获取鉴权签名的回调函数
var getAuthorization = function (options, callback) {
  // console.log(options);
    //  方法一，将 COS 操作的 method 和 pathname 传递给服务端，由服务端计算签名返回（推荐）
    // var method = (options.method || 'get').toLowerCase();
    // var pathname = options.pathname || '/';
    //
    // let argu = { method, pathname}
    // console.log(argu);
    // axios.post(`${config.api}/auth`, argu)
    axios.post(`${config.api}/auth`, options)
    .then(
      res => {
        // console.log("9999999999")
        // console.log(res.data)
        const authorization = res.data
        callback(authorization);
      }
    )
    .catch(err => {
      if (err) {
        console.log(err)
      }
    })

    // 方法二，直接在前端利用 SecretId 和 SecretKey 计算签名，适合前端调试使用，不提倡在前端暴露 SecretId 和 SecretKey
    // var authorization = COS.getAuthorization({
    //   SecretId: `${config.SecretId}`,
    //   SecretKey: `${config.SecretKey}`,
    //   method: (options.method || 'get').toLowerCase(),
    //   pathname: options.pathname || '/',
    // });
    // callback(authorization);
    // console.log(authorization);

};

var params = {
  AppId: `${config.AppId}`,                            /* 必须 */
  getAuthorization: getAuthorization,                   /* 必须 */
  // FileParallelLimit: 'NUMBER',                          /* 非必须 */
  // ChunkParallelLimit: 'NUMBER',                         /* 非必须 */
  // ChunkSize: 'NUMBER',                                  /* 非必须 */
  // ProgressInterval: 'NUMBER',                           /* 非必须 */
  // Domain: 'STRING_VALUE',                               /* 非必须 */
};

var cos = new COS(params);
// js-sdk配置部分至此


const { Header, Content, Footer } = Layout

// Modal
const CollectionCreateForm = Form.create()(
  (props) => {
    console.log(props.oldName);
    const { visible, onCancel, onCreate, form } = props;
    const { getFieldDecorator } = form;
    return (
      <Modal
        visible={visible}
        title="重命名文件"
        okText="确定"
        onCancel={onCancel}
        onOk={onCreate}
      >
        <Form layout="vertical">
          <FormItem label="新名称">
            {getFieldDecorator('newName', {
              rules: [{
                required: true,
                message: '不可与原名称相同',
                validator: (rule, value, cb) => (
                  (!value || value === props.oldName) ? cb(true) : cb()
                ),
              }],
            })(
              <Input placeholder='不可与原名称相同' />
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }
);

class Test extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
      contents: [],
      percent: 0,
      name: '文件名',
      progress: [],
      folder: '',
      inputClass: '',
      disable: false,
      oldName: ''
    }
  }

  componentWillMount () {
    axios.get(`${config.api}/bucket`)
    .then(
      res => {
        this.setState({
          contents: res.data.Contents
        })
        console.log(this.state.contents)
      }
    )
    .catch(err => {
      if (err.response) {
        console.log(err.response.data.err)
      } else {
        console.log(err)
      }
    })

    // axios.post(`${config.api}/sliceUploadFile`)
    // .then(
    //   res => {
    //     console.log(res)
    //   }
    // )
    // .catch(err => {
    //   if (err.response) {
    //     console.log(err.response.data.err)
    //   } else {
    //     console.log(err)
    //   }
    // })
  }

  //指定的文件夹名
  onPressEnter (e) {
    console.log(e.target.value)
    let folderName = e.target.value.trim()
    let parseName = /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/

    //分开判断，便于精确提示用户
    if (folderName === '') {
      message.success('文件将上传至bucket顶层')
      this.setState({
        folder: ``
      })
    } else if (folderName.length > 20) {
      message.error('最多支持 20 个字符')
      this.setState({
        inputClass: 'has-feedback has-error'
      })
    } else if (!parseName.test(folderName)) {
      message.error('仅支持数字、中英文、下划线')
      this.setState({
        inputClass: 'has-feedback has-error'
      })
    } else {
      this.setState({
        folder: `${folderName}/`,
        inputClass: 'has-feedback has-success'
      })
      e.target.value = ''
      message.success(`文件将上传至${folderName}/`)
    }
  }

    // Modal 逻辑
    showModal = (e) => {
      console.log('showModal');
      console.log(e.target.dataset);
      this.setState({
         visible: true,
         oldName: e.target.dataset.oldname
       })
    }
    handleCancel = () => {
      console.log('handleCancel')
      this.setState({ visible: false });
    }
    handleCreate = () => {
      console.log('handleCreate');
      let that = this
      const form = this.form

      form.validateFields((err, values) => {

        if (err) {
          return
        }

        console.log('Received values of form: ', values);

        let newName = values.newName

        // 重命名
        // const onRename = function () {

          // 创建源文件副本，命名为新名字
          console.log('rename');
          var AppId = config.AppId;
          var Bucket = config.Bucket;
          if (config.Bucket.indexOf('-') > -1) {
            var arr = config.Bucket.split('-');
            Bucket = arr[0];
            AppId = arr[1];
          }
          cos.putObjectCopy({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: newName,
            // CopySource: Bucket + '-' + AppId + '.cos.' + config.Region + '.myqcloud.com/' + record.Key,
            CopySource: Bucket + '-' + AppId + '.cos.' + config.Region + '.myqcloud.com/' + encodeURI(this.state.oldName),
            MetadataDirective : 'Replaced',
          }, function (err, data) {
            if(err) {
              console.log(err);
              message.error('副本创建失败')
            } else {
              console.log(data);
              // message.success(`已：${record.Key}`)

              // 删除源文件
              const delParams = {
                Bucket: `${config.Bucket}`,
                Region: `${config.Region}`,                       /* 必须 */
                Key : `${that.state.oldName}`                                  /* 必须 */
              };

              cos.deleteObject(delParams, function(err, data) {
                if(err) {
                  console.log(err);
                  message.error('源文件删除失败')
                } else {
                  console.log(data);

                  // 刷新列表
                  axios.get(`${config.api}/bucket`)
                  .then(
                    res => {
                      that.setState({
                        contents: res.data.Contents
                      })
                      console.log(that.state.contents)
                    }
                  )
                  .catch(err => {
                    if (err.response) {
                      console.log(err.response.data.err)
                    } else {
                      console.log(err)
                    }
                  })
                  message.success('重命名成功')

                  that.setState({
                    oldName: ''
                  })
                }
              });
            }
          });
        // }

        form.resetFields();
        this.setState({ visible: false });
      });
    }
    saveFormRef = (form) => {
      console.log('saveFormRef')
      this.form = form;
    }


  render () {
    let that = this

    //antd表格部分
    const TableColumns = [{
      title: '名称',
      dataIndex: 'Key',
      key: 'Key',
    }, {
      title: '更新时间',
      dataIndex: 'LastModified',
      key: 'LastModified',
      render: (text) => {
        return <span>{moment(text).format('YYYY-MM-DD kk:mm:ss')}</span>
      }
    }, {
      title: '操作',
      dataIndex: 'ETag',
      key: 'ETag',
      render: (text, record, index) => {

        // // 重命名
        // const onRename = function () {
        //   console.log('rename');
        //   var AppId = config.AppId;
        //   var Bucket = config.Bucket;
        //   if (config.Bucket.indexOf('-') > -1) {
        //     console.log(">>>>>");
        //     var arr = config.Bucket.split('-');
        //     Bucket = arr[0];
        //     AppId = arr[1];
        //   }
        //   cos.putObjectCopy({
        //     Bucket: config.Bucket,
        //     Region: config.Region,
        //     Key: 'OOOXXX',
        //     CopySource: Bucket + '-' + AppId + '.cos.' + config.Region + '.myqcloud.com/' + encodeURI(record.Key),
        //     MetadataDirective : 'Replaced'
        //   }, function (err, data) {
        //     if(err) {
        //       console.log(err);
        //       message.error('副本创建失败')
        //     } else {
        //       console.log(data);
        //       // message.success(`已：${record.Key}`)
        //
        //       const delParams = {
        //         Bucket: `${config.Bucket}`,
        //         Region: `${config.Region}`,                       /* 必须 */
        //         Key : record.Key                                  /* 必须 */
        //       };
        //
        //       cos.deleteObject(delParams, function(err, data) {
        //         if(err) {
        //           console.log(err);
        //           message.error('源文件删除失败')
        //         } else {
        //           console.log(data);
        //           axios.get(`${config.api}/bucket`)
        //           .then(
        //             res => {
        //               that.setState({
        //                 contents: res.data.Contents
        //               })
        //               console.log(that.state.contents)
        //             }
        //           )
        //           .catch(err => {
        //             if (err.response) {
        //               console.log(err.response.data.err)
        //             } else {
        //               console.log(err)
        //             }
        //           })
        //           message.success('重命名成功')
        //         }
        //       });
        //     }
        //   });
        // }

        const onDelete = function () {
          // showDeleteConfirm() {
            confirm({
              title: `确认删除 ${record.Key} ？`,
              content: '删除之后无法恢复',
              okText: 'Yes',
              okType: 'danger',
              cancelText: 'No',
              onOk() {
                console.log('OK')
                const delParams = {
                  Bucket: `${config.Bucket}`,
                  Region: `${config.Region}`,                       /* 必须 */
                  Key : record.Key                                  /* 必须 */
                }

                cos.deleteObject(delParams, function(err, data) {
                  if(err) {
                    console.log(err);
                    message.error(`${record.Key} 删除失败`)
                  } else {
                    console.log(data);
                    message.success(`已删除：${record.Key}`)
                    axios.get(`${config.api}/bucket`)
                    .then(
                      res => {
                        that.setState({
                          contents: res.data.Contents
                        })
                        // console.log(that.state.contents)
                      }
                    )
                    .catch(err => {
                      if (err.response) {
                        console.log(err.response.data.err)
                      } else {
                        console.log(err)
                      }
                    })
                  }
                });

              },
              onCancel() {
                console.log('Cancel');
              },
            });
          // }
        }

        return (
          <span>
            <Button onClick={onDelete}>删除</Button>
            <span className="ant-divider" />
            {/* <Button onClick={onRename}>重命名</Button> */}
            {/* <div> */}
              <Button onClick={this.showModal} data-oldName={record.Key}>重命名</Button>
              <CollectionCreateForm
                ref={this.saveFormRef}
                visible={this.state.visible}
                onCancel={this.handleCancel}
                onCreate={this.handleCreate}
                oldName={this.state.oldName}
              />
            {/* </div> */}
          </span>
        )
      },
    }]

    //antd拖拽组件部分
    const props = {
      name: 'file',
      multiple: true,
      showUploadList: false,
      action: '', //无效的上传地址
      onChange(info) {
        const status = info.file.status;
        if (status !== 'uploading') {
          console.log(info.file);
          console.log(info.fileList);
          //就是要通过antd，拖拽后拿到File对象
          let file = info.file.originFileObj
          console.log(file);

          // 检测同路径同名对象
          let fileAlreadyExist = that.state.contents.filter(
            item => {
              return file.name === item.Key
            }
          )
          if (fileAlreadyExist.length !== 0) {
            message.error(`已存在同名文件，${file.name}未上传`)
            return
            console.log("++++++++++++++++++++++++");
            console.log(fileAlreadyExist);
            // console.log(file);
          }


          // 为新拖拽的文件生成一个空的进度条
          let uploadObj = {
            percent: 0,
            name: file.name,
            status: 'normal',
            uid: file.uid
          }
          console.log(that.state.progress);
          let [ ...clonedProgress ] = that.state.progress


          clonedProgress.push(uploadObj)

          that.setState({
            progress: clonedProgress
          })
          console.log(that.state.progress);


          //尝试在回调中引入cos-js-sdk 分块上传
          var params = {
            Bucket: `${config.Bucket}`,
            Region: `${config.Region}`,                      /* 必须 */
            Key: `${that.state.folder}${file.name}`,
            Body: file,                                     /* 必须 */


            onProgress: function (progressData) {           /* 非必须 */
              console.log(JSON.stringify(progressData))
              //打印内容：
              // test.js:160 {"loaded":5947392,"total":11074706,"speed":5198769.23,"percent":0.53}

              //进度条信息++++++++++
              // let percent = progressData.percent*100
              //
              // //运用数组栈方法来更新进度信息
              // let [ ...clonedTempProgress ] = that.state.progress
              // console.log(that.state.progress);
              //
              // let newUploadFileInfo = clonedTempProgress.pop()
              // //更新进度
              // newUploadFileInfo.percent = percent
              //
              // if (percent < 100) {
              //   newUploadFileInfo.status = 'active'
              // } else if (percent === 100) {
              //   newUploadFileInfo.status = 'success'
              // }
              //
              // clonedTempProgress.push(newUploadFileInfo)
              //
              // that.setState({
              //   progress: clonedTempProgress
              // })
              // console.log(that.state.progress)
              // ++++++++++++++

              //当多个文件--------
              let [ ...clonedTempProgress ] = that.state.progress

              //筛选出本次上传进度信息的主人 以及它在数组中的index
              let newUploadFileInfo = clonedTempProgress.find(
                item => item.uid === file.uid
              )
              let thisFilesIndex = clonedTempProgress.findIndex(
                item => item.uid === file.uid
              )

              console.log(newUploadFileInfo);
              console.log(thisFilesIndex);

              let percent = progressData.percent*100

              // thisFilesProgress.percent = percent
              // //运用数组栈方法来更新进度信息
              // let [ ...clonedTempProgress ] = that.state.progress
              // console.log(that.state.progress);
              //
              // let newUploadFileInfo = clonedTempProgress.filter(
              //   item => {
              //     return item.uid === file.uid
              //   }
              // )

              // 精确更新进度
              newUploadFileInfo.percent = percent

              if (percent < 100) {
                newUploadFileInfo.status = 'active'
              } else if (percent === 100) {
                newUploadFileInfo.status = 'success'
              }

              // clonedTempProgress.push(newUploadFileInfo)
              clonedTempProgress[thisFilesIndex] = newUploadFileInfo

              that.setState({
                progress: clonedTempProgress
              })
              console.log(that.state.progress)


              // --------

            }
          };
          console.log(typeof file);
          console.log(info.file.originFileObj);
          console.log(info.file.originFileObj.name);

          cos.sliceUploadFile(params, function(err, data) {
            if(err) {
              console.log(err);
              //运用数组栈方法来使进度条显示上传出错
              let [ ...clonedTempProgress ] = that.state.progress
              let newUploadFileInfo = clonedTempProgress.pop()
              //更新进度
              newUploadFileInfo.status = 'exception'
              clonedTempProgress.push(newUploadFileInfo)

              that.setState({
                progress: clonedTempProgress
              })
            } else {
              //上传成功
              console.log(data);
              //data.Location: "testbucket-1252891333.ap-beijing.myqcloud.com/gg.jpg"

              message.success(`成功上传`)

              //更新obj列表
              axios.get(`${config.api}/bucket`)
              .then(
                res => {
                  that.setState({
                    contents: res.data.Contents
                  })
                  console.log(that.state.contents)
                }
              )
              .catch(err => {
                console.log(err)
              })

            }
          });
          //cos-js-sdk 分块上传 结束
        }
        // if (status === 'done') {
        //   message.success(`${info.file.name} file uploaded successfully.`);
        // } else if (status === 'error') {
        //   message.error(`${info.file.name} file upload failed.`);
        // }

      },//onchange结束
    }

    return (
      <Layout style={{ minHeight: '100vh', width: '100%' }}>

        <Header style={{background: '#fff', padding: 10, display: 'flex', flexDirection: 'row-reverse', alignItems: 'baseline'}}>
          <span>用户名</span>
          <Icon type='user' />
        </Header>

        {/* 展示bucket内容 */}
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '12px 0' }}>
            <Breadcrumb.Item>Demo</Breadcrumb.Item>
            <Breadcrumb.Item>Test</Breadcrumb.Item>
          </Breadcrumb>
          <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>

            <Table columns={TableColumns}
            dataSource={this.state.contents}
            rowKey={item => item.ETag}
            // onDelete = {this.onDelete}
            />

          </div>
        </Content>

        {/* <CollectionsPage oldName={'oldName'}/> */}

        {/* 进度条 */}
        {
          this.state.progress.map(
            (item, index) => {
              return (
                <div key={index}>
                  <text>{item.name}</text>
                  <Progress percent={item.percent} status={item.status} />
                </div>
              )
            }
          )
        }

        {/*上传目标文件夹*/}
        <div className={"has-success"} style={{ marginTop: 16, height: 80 }}>
          <text>目标文件夹：{this.state.folder ? this.state.folder : 'bucket顶层'}</text>
          <Input placeholder="要传入的文件夹名称" onPressEnter={this.onPressEnter.bind(this)} />
          <div className="ant-form-explain">可用数字、中英文、下划线组合，最多20个字符</div>
        </div>

        {/* 拖拽块 */}
        <div style={{ marginTop: 16, height: 180 }}>

          <Dragger {...props}>
            <p className="ant-upload-drag-icon">
              <Icon type="inbox" />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files</p>
          </Dragger>
        </div>

        <Footer style={{ textAlign: 'center' }}>
          Ant Design ©2016 Created by Ant UED
        </Footer>
      </Layout>
    )
  }
}

export default Test
// 已经获得了必要参数，Name和Key，传递给content组件就行了。后者组织成	testbucket-1252891333.file.myqcloud.com/vvv.jpg
