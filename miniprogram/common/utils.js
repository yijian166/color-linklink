
/**
 * 封装通用的方法
 */
export default {
  async callCloudFunction(name, params = {}) {
    let resp = {};
    try {
      const res = await wx.cloud.callFunction({
        name,
        data:params,
      });
      const {
        result = {}
      } = res;
      const {
        code,
        message = "",
        data
      } = result;
      resp = {
        code,
        message,
        data,
      };
    } catch (error) {
      console.error("callCloudFunction error" + cloudFunctionName, error);
      Object.assign(resp, {
        code: "SYSTEM",
        message: "系统错误",
      });
    }
    return resp;
  },

};