import React from 'react'
import moment from 'moment'
import { Button, message } from 'antd'
// import axios from 'axios'
import config from '../config'
import COS from 'cos-js-sdk-v5'

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

    const getAuthorization = function (options, callback) {
        // 方法二，直接在前端利用 SecretId 和 SecretKey 计算签名，适合前端调试使用，不提倡在前端暴露 SecretId 和 SecretKey
        var authorization = COS.getAuthorization({
          SecretId: `${config.SecretId}`,
          SecretKey: `${config.SecretKey}`,
          method: (options.method || 'get').toLowerCase(),
          pathname: options.pathname || '/',
        });
        callback(authorization);
    };

    const params = {
      AppId: `${config.AppId}`,                            /* 必须 */
      getAuthorization: getAuthorization,                   /* 必须 */
    };

    const cos = new COS(params);
    // js-sdk配置部分至此

    // const onRename = function () {
    //   console.log('rename');
    //   console.log(record);
    //   const renameParams = {
    //     Bucket: `${config.Bucket}`,
    //     Region: `${config.Region}`,                       /* 必须 */
    //     // Key : record.Key,                           /* 必须 */
    //     Key : record.Key,
    //     CopySource : '',
    //     // MetadataDirective : 'Replaced',
    //     // ContentType : 'application/xml'
    //     // testbucket-1252891333.cos.ap-beijing.myqcloud.com/aabbcc?1
    //     // testbucket-1252891333.cos.ap-beijing.myqcloud.com/aabbcc?1
    //   };
    //
    //   cos.putObjectCopy(renameParams, function(err, data) {
    //     if(err) {
    //       console.log(err);
    //     } else {
    //       console.log(data);
    //     }
    //   });
    // }

    const onDelete = function () {

      const delParams = {
        Bucket: `${config.Bucket}`,
        Region: `${config.Region}`,                       /* 必须 */
        Key : record.Key                                  /* 必须 */
      };

      cos.deleteObject(delParams, function(err, data) {
        if(err) {
          console.log(err);
          message.error(`${record.Key} 删除失败`)
        } else {
          console.log(data);
          message.success(`已删除：${record.Key}`)
        }
      });
    }
    return (
      <span>
        <Button onClick={onDelete}>删除</Button>
        <span className="ant-divider" />
        <Button onClick={onRename}>重命名</Button>
      </span>
    )
  },
}]

export default TableColumns
