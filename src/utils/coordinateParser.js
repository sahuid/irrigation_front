/**
 * 解析坐标点字符串，格式如：{87.29547234,44.21764995},{87.29537416,44.21707246}
 * 第一个数值为经度，第二个为纬度
 * @param {string} coordinateString 坐标字符串
 * @returns {Array} 格式化后的坐标点数组，包含经纬度对象
 */
export function parseCoordinateString(coordinateString) {
  if (!coordinateString || typeof coordinateString !== 'string') {
    return [];
  }

  try {
    // 清理字符串中的空白字符
    const cleanString = coordinateString.trim();
    
    // 使用正则表达式匹配所有的{x,y}格式的坐标点
    const coordinatePattern = /\{([^{}]+),([^{}]+)\}/g;
    const matches = [...cleanString.matchAll(coordinatePattern)];
    
    // 转换匹配到的坐标点为对象数组
    const coordinates = matches.map(match => {
      // 使用parseFloat保留原始精度，不进行四舍五入
      const longitudeStr = match[1].trim();
      const latitudeStr = match[2].trim();
      
      const longitude = parseFloat(longitudeStr);
      const latitude = parseFloat(latitudeStr);
      
      // 验证坐标有效性
      if (isNaN(longitude) || isNaN(latitude)) {
        return null;
      }
      
      return {
        longitude,
        latitude
      };
    }).filter(coord => coord !== null); // 过滤掉无效的坐标
    
    return coordinates;
  } catch (error) {
    console.error('解析坐标点字符串出错:', error);
    return [];
  }
} 