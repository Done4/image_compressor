// index.js
Page({
  data: {
    showUpload: true,
    showSettings: true,
    showPreview: false,
    errorMessage: '',
    imageInfo: '',
    originalImage: '',
    compressedImage: '',
    originalImageInfo: '',
    compressedImageInfo: '',
    quality: 80,
    minquality:0.01,
    maxquality:1,
    targetSize: '',
    outputFormats: ['保持原格式', 'JPG', 'PNG'],
    outputFormatIndex: 0,
    resizeOptions: ['保持原尺寸', '自定义尺寸', '按百分比缩放'],
    resizeOptionIndex: 0,
    showCustomSize: false,
    showPercentageSize: false,
    width: 800,
    height: 600,
    maintainRatio: true,
    scalePercentage: 50,
    isCompressing: false,
    isProcessing: false,
    originalWidth: 0,
    originalHeight: 0,
    aspectRatio: 1,
    fileName: '',
    fileExtension: '',
    actualOutputExtension: '', // 实际使用的输出文件扩展名
    compressionTimer: null, // 压缩计时器
    lastCompressedResult: null, // 最后一次压缩结果
    compressionCount: 0, // 当前压缩次数
    maxCompressionCount: 10 // 最大压缩次数
  },

  onLoad() {
    wx.cloud.init();
    // 页面加载完成后初始化
    this.resetToDefaultSettings();
    this.data.outputFormats[this.data.outputFormatIndex].checked = true;
    console.log("init ok");
  },

  // 选择图片
  selectImage() {
    if (this.data.isProcessing) return;
    const that = this;
    
    // 清除计时器
    if (that.data.compressionTimer) {
      clearTimeout(that.data.compressionTimer);
    }
    
    //chooseMedia chooseImage
    wx.chooseMedia({
      count: 1,
      sizeType: ['compressed'],//'original'
      sourceType: ['album', 'camera'],
      mediaType : ['image'],
      success(res) {
        console.log(res)
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const file = res.tempFiles[0];
        that.handleFile(tempFilePath, file);
        that.setData({
          compressedImage: '',
          compressedImageInfo: '',
          actualOutputExtension: '', // 重置实际输出扩展名
          compressionTimer: null,
          lastCompressedResult: null
        });
      },
      fail(err) {
        console.error('选择图片失败:', err);
        that.showError('选择图片失败，请重试');
      }
    });
  },

  // 处理选择的文件
  handleFile(filePath, file) {
    const that = this;
    // 获取文件名和扩展名
    const nameParts = file.tempFilePath.split('.');
    that.setData({
      fileExtension: nameParts.pop().toLowerCase(),
      fileName: nameParts.join('.')
    });

    // 获取图片信息
    wx.getImageInfo({
      src: filePath,
      success(imageInfo) {
        // 直接处理图片，不进行安全校验
        that.setData({
          originalImage: filePath,
          originalWidth: imageInfo.width,
          originalHeight: imageInfo.height,
          aspectRatio: imageInfo.width / imageInfo.height,
          width: imageInfo.width,
          height: imageInfo.height,
          imageInfo: `尺寸: ${imageInfo.width} x ${imageInfo.height}\n大小: ${that.formatFileSize(file.size)}\n类型: ${imageInfo.type}`,
          originalImageInfo: `尺寸: ${imageInfo.width} x ${imageInfo.height} | 大小: ${that.formatFileSize(file.size)}`,
          showUpload: false,
          showPreview: true,
          isProcessing: false
        });
      },
      fail(err) {
        console.error('获取图片信息失败:', err);
        that.setData({ isProcessing: false });
        that.showError('处理图片失败，请重试');
        wx.hideLoading();
      }
    });
  },
  
  // 压缩质量变化
  onQualityChange(e) {
    console.log("onQualityChange");
    this.setData({
      quality: e.detail.value
    });
  },

  // 目标大小变化
  onTargetSizeChange(e) {
    this.setData({
      targetSize: e.detail.value
    });
  },

  // 输出格式变化
  onOutputFormatChange(e) {
    this.setData({
      outputFormatIndex: e.detail.value
    });
    console.log("输出格式已更新为:", this.data.outputFormats[this.data.outputFormatIndex]);
  },

  // 尺寸调整选项变化
  onResizeOptionChange(e) {
    console.log("尺寸调整事件被触发", e.detail.value);
    const index = e.detail.value;
    this.setData({
      resizeOptionIndex: index,
      showCustomSize: index == 1,
      showPercentageSize: index == 2
    });
    console.log("尺寸调整已更新为:", this.data.resizeOptions[this.data.resizeOptionIndex]);
  },

  // 宽度变化
  onWidthChange(e) {
    const width = parseInt(e.detail.value);
    console.log("宽度 比例",this.data.aspectRatio)
    if (this.data.maintainRatio && this.data.aspectRatio > 0) {
      this.setData({
        width: width,
        height: Math.round(width / this.data.aspectRatio)
      });
    } else {
      this.setData({
        width: width
      });
    }
  },

  // 高度变化
  onHeightChange(e) {
    const height = parseInt(e.detail.value);
    if (this.data.maintainRatio && this.data.aspectRatio > 0) {
      this.setData({
        height: height,
        width: Math.round(height * this.data.aspectRatio)
      });
    } else {
      this.setData({
        height: height
      });
    }
  },
  
  // 格式化文件大小
  // formatFileSize(bytes) {
  //   if (bytes == 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // },
  
  // 显示错误信息
  showError(message) {
    this.setData({
      errorMessage: message
    });
    
    // 3秒后自动清除错误信息
    setTimeout(() => {
      this.setData({
        errorMessage: ''
      });
    }, 3000);
  },

  // 保持比例变化
  onMaintainRatioChange() {
    this.setData({
      maintainRatio: !this.data.maintainRatio
    });
  },

  // 缩放比例变化
  onScalePercentageChange(e) {
    this.setData({
      scalePercentage: e.detail.value
    });
  },

  // 移除recompressImage函数，功能已整合到compressImage中

  // 压缩图片
  compressImage() {
    if (this.data.originalImage=='') {
      this.showError("选择一个图片");
      return;
    }
    if (this.data.isCompressing || this.data.isProcessing) return;
    
    // 检查是否设置了目标大小
    const targetSize = this.data.targetSize ? parseInt(this.data.targetSize) * 1024 : 0;
    
    // 如果设置了目标大小，检查是否比原图大
    if (targetSize > 0) {
      // 获取原图大小信息
      wx.getFileSystemManager().getFileInfo({
        filePath: this.data.originalImage,
        success: (fileInfo) => {
          const originalSize = fileInfo.size;
          
          // 如果目标大小比原图大，提示用户无需压缩
          if (targetSize > originalSize) {
            this.showError(`目标大小(${this.formatFileSize(targetSize)})比原图(${this.formatFileSize(originalSize)})大，无需压缩`);
            return;
          } else {
            // 目标大小小于原图，继续压缩流程
            this.startCompression();
          }
        },
        fail: (err) => {
          console.error('获取原图大小失败:', err);
          // 获取失败时仍继续压缩流程
          this.startCompression();
        }
      });
    } else {
      // 未设置目标大小，直接压缩
      this.startCompression();
    }
  },
  
  // 开始压缩流程
  startCompression() {
    // 清除之前的压缩结果和计时器
    if (this.data.compressionTimer) {
      clearTimeout(this.data.compressionTimer);
    }
    
    this.setData({
      compressedImage: '',
      compressedImageInfo: '',
      isCompressing: true,
      isProcessing: true,
      disableSettings: true,
      lastCompressedResult: null,
      compressionTimer: null,
      compressionCount: 0,
      minquality:0.01,
      maxquality:1,
    });
    
    const that = this;
    
    // 计算目标尺寸
    let targetWidth = this.data.originalWidth;
    let targetHeight = this.data.originalHeight;

    // 根据尺寸选项调整大小
    if (this.data.resizeOptionIndex == 1) { // 自定义尺寸
      targetWidth = this.data.width;
      targetHeight = this.data.height;
    } else if (this.data.resizeOptionIndex == 2) { // 按百分比缩放
      const percentage = this.data.scalePercentage / 100;
      targetWidth = Math.round(this.data.originalWidth * percentage);
      targetHeight = Math.round(this.data.originalHeight * percentage);
    }

    // 获取输出格式
    let outputFormat = this.data.outputFormats[this.data.outputFormatIndex];
    let outputExtension;

    if (outputFormat == '保持原格式') {
      outputExtension = this.data.fileExtension;
    } else if (outputFormat == 'JPG') {
      outputExtension = 'jpg';
    } else if (outputFormat == 'PNG') {
      outputExtension = 'png';
    }
    
    // 设置10秒计时器，超时后使用最后一次压缩结果
    // const timer = setTimeout(() => {
    //   console.log('压缩超时，使用最后一次压缩结果');
    //   if (that.data.lastCompressedResult) {
    //     // 使用最后一次压缩结果
    //     const result = that.data.lastCompressedResult;
    //     that.showCompressionResult(result.path, result.width, result.height);
    //   } else {
    //     // 如果没有任何压缩结果，显示错误
    //     that.showError('压缩超时，未获得有效结果');
    //     that.resetCompressButton();
    //   }
    // }, 10000); // 10秒超时
    
    // that.setData({
    //   compressionTimer: timer
    // });

    // 检查是否为PNG格式或iOS设备（iOS上wx.compressImage仅支持JPG）
    // const isPNG = outputExtension.toLowerCase() === 'png';
    // const isIOS = wx.getSystemInfoSync().platform === 'ios';
    
    // 如果是PNG格式或iOS设备上的非JPG格式，直接使用Canvas方式压缩
    // if (isPNG || (isIOS && outputExtension.toLowerCase() !== 'jpg')) {
    //   console.log('使用Canvas方式压缩图片');
    //   this.compressImageByCanvas(targetWidth, targetHeight, outputExtension);
    //   return;
    // }
    
    // 使用微信官方的图片压缩API（仅适用于JPG格式，或Android设备上的其他格式）
    wx.compressImage({
      src: this.data.originalImage,
      quality: this.data.quality,  // 压缩质量，范围0～100
      compressedWidth: targetWidth,  // 压缩后图片的宽度
      compressedHeight: targetHeight, // 压缩后图片的高度
      success(res) {
        // 保存当前压缩结果
        that.setData({
          lastCompressedResult: {
            path: res.tempFilePath,
            width: targetWidth,
            height: targetHeight
          }
        });
        
        // 获取压缩后的图片信息
        wx.getImageInfo({
          src: res.tempFilePath,
          success(imageInfo) {
            // 获取压缩后的文件大小
            wx.getFileSystemManager().getFileInfo({
              filePath: res.tempFilePath,
              success(fileInfo) {
                // 检查是否设置了目标大小
                const targetSize = that.data.targetSize ? parseInt(that.data.targetSize) * 1024 : 0;
                
                if (targetSize > 0 && Math.abs(fileInfo.size - targetSize) / targetSize > 0.03) {
                  // 如果设置了目标大小且当前大小与目标相差超过3%，则调整质量并重试
                  that.adjustQualityAndCompress(targetSize, fileInfo.size, that.data.quality / 100, targetWidth, targetHeight, outputExtension);
                } else {
                  // 清除计时器并显示结果
                  clearTimeout(that.data.compressionTimer);
                  // 显示压缩结果
                  that.setData({
                    compressedImage: res.tempFilePath,
                    compressedImageInfo: `尺寸: ${imageInfo.width} x ${imageInfo.height} | 大小: ${that.formatFileSize(fileInfo.size)}`,
                    showPreview: true,
                    isCompressing: false,
                    isProcessing: false,
                    disableSettings: false
                  });
                }
              },
              fail(err) {
                console.error('获取文件信息失败:', err);
                // 不立即显示错误，等待计时器或其他压缩方法
              }
            });
          },
          fail(err) {
            console.error('获取图片信息失败:', err);
            // 不立即显示错误，等待计时器或其他压缩方法
          }
        });
      },
      fail(err) {
        console.error('压缩图片失败:', err);
        // 如果官方API失败，回退到canvas方式压缩
        that.compressImageByCanvas(targetWidth, targetHeight, outputExtension);
      }
    });
  },

  // 使用Canvas方式压缩图片（备用方案）
  compressImageByCanvas(targetWidth, targetHeight, outputExtension) {
    const that = this;
    const quality = this.data.quality / 100;
    
    // 创建canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#compress-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 设置canvas尺寸
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 绘制图片到canvas
        const image = canvas.createImage();
        image.src = that.data.originalImage;
        image.onload = () => {
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

          // 将canvas内容转换为图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            fileType: outputExtension,
            quality: quality,
            success(res) {
              // 保存当前压缩结果
              that.setData({
                lastCompressedResult: {
                  path: res.tempFilePath,
                  width: targetWidth,
                  height: targetHeight
                }
              });
              
              // 检查是否设置了目标大小
              const targetSize = that.data.targetSize ? parseInt(that.data.targetSize) * 1024 : 0;
              if (targetSize > 0) {
                // 获取压缩后的图片大小
                wx.getFileSystemManager().getFileInfo({
                  filePath: res.tempFilePath,
                  success(fileInfo) {
                    const fileSize = fileInfo.size;
                    // 如果大小不符合要求，调整质量并重试
                    if (Math.abs(fileSize - targetSize) / targetSize > 0.03) {
                      that.adjustQualityAndCompress(targetSize, fileSize, quality, targetWidth, targetHeight, outputExtension);
                    } else {
                      // 清除计时器并显示结果
                      clearTimeout(that.data.compressionTimer);
                      that.showCompressionResult(res.tempFilePath, targetWidth, targetHeight);
                    }
                  },
                  fail(err) {
                    console.error('获取文件信息失败:', err);
                    // 不立即显示错误，等待计时器或其他压缩方法
                  }
                });
              } else {
                // 清除计时器并显示结果
                clearTimeout(that.data.compressionTimer);
                that.showCompressionResult(res.tempFilePath, targetWidth, targetHeight);
              }
            },
            fail(err) {
              console.error('canvas转换为图片失败:', err);
              // 不立即显示错误，等待计时器或其他压缩方法
            }
          });
        };
        image.onerror = (err) => {
          console.error('图片加载失败:', err);
          // 不立即显示错误，等待计时器
        };
      });
  },

  // 调整质量并重试压缩
  adjustQualityAndCompress(targetSize, currentSize, currentQuality, targetWidth, targetHeight, outputExtension) {
    const that = this;
    
    // 增加压缩次数
    const currentCount = that.data.compressionCount + 1;
    that.setData({
      compressionCount: currentCount
    });
    
    // 检查是否超过最大压缩次数
    if (currentCount > that.data.maxCompressionCount) {
      console.log(`已达到最大压缩次数(${that.data.maxCompressionCount})，停止压缩`);
      // 使用最后一次压缩结果
      if (that.data.lastCompressedResult) {
        clearTimeout(that.data.compressionTimer);
        that.showCompressionResult(
          that.data.lastCompressedResult.path, 
          that.data.lastCompressedResult.width, 
          that.data.lastCompressedResult.height
        );
      } else {
        // 如果没有压缩结果，显示错误
        that.showError('达到最大压缩次数，但未获得满意结果');
      }
      that.resetCompressButton();
      return;
    }
    
    let newQuality = currentQuality;
    let maxQuality = that.data.maxquality;
    let minQuality = that.data.minquality;
    if (currentSize > targetSize) {
      maxQuality = newQuality;
      newQuality = (minQuality + currentQuality) / 2;
  } else {
      minQuality = newQuality;
      newQuality = (currentQuality + maxQuality) / 2;    
  }
  console.log("第",currentCount,"次压缩", newQuality)
    // 限制质量范围
    newQuality = Math.round(newQuality * 100) / 100;

    // 更新质量显示
    that.setData({
      quality: Math.round(newQuality * 100),
      maxquality: maxQuality,
      minquality: minQuality
    });

    // 尝试使用微信官方API重新压缩（仅适用于JPG格式，或Android设备上的其他格式）
    wx.compressImage({
      src: that.data.originalImage,
      quality: Math.round(newQuality * 100),  // 压缩质量，范围0～100
      compressedWidth: targetWidth,  // 压缩后图片的宽度
      compressedHeight: targetHeight, // 压缩后图片的高度
      success(res) {
        // 保存当前压缩结果
        that.setData({
          lastCompressedResult: {
            path: res.tempFilePath,
            width: targetWidth,
            height: targetHeight
          }
        });
        
        // 检查大小是否符合要求
        wx.getFileSystemManager().getFileInfo({
          filePath: res.tempFilePath,
          success(fileInfo) {
            const newSize = fileInfo.size;
            // 如果仍然不符合要求，继续调整
            if (Math.abs(newSize - targetSize) / targetSize > 0.03) {
              that.adjustQualityAndCompress(targetSize, newSize, newQuality, targetWidth, targetHeight, outputExtension);
            } else {
              // 清除计时器并显示结果
              clearTimeout(that.data.compressionTimer);
              that.showCompressionResult(res.tempFilePath, targetWidth, targetHeight);
            }
          },
          fail(err) {
            console.error('获取文件信息失败:', err);
            // 不立即显示错误，等待计时器或其他压缩方法
          }
        });
      },
      fail(err) {
        console.error('压缩图片失败，尝试使用Canvas方式:', err);
        // 如果官方API失败，回退到canvas方式压缩
        that.adjustQualityAndCompressByCanvas(targetSize, newQuality, targetWidth, targetHeight, outputExtension);
      }
    });
  },

  // 使用Canvas方式调整质量并重试压缩（备用方案）
  adjustQualityAndCompressByCanvas(targetSize, newQuality, targetWidth, targetHeight, outputExtension) {
    const that = this;
    
    // 增加压缩次数
    const currentCount = that.data.compressionCount + 1;
    that.setData({
      compressionCount: currentCount
    });
    
    // 检查是否超过最大压缩次数
    if (currentCount > that.data.maxCompressionCount) {
      console.log(`已达到最大压缩次数(${that.data.maxCompressionCount})，停止压缩`);
      // 使用最后一次压缩结果
      if (that.data.lastCompressedResult) {
        clearTimeout(that.data.compressionTimer);
        that.showCompressionResult(
          that.data.lastCompressedResult.path, 
          that.data.lastCompressedResult.width, 
          that.data.lastCompressedResult.height
        );
      } else {
        // 如果没有压缩结果，显示错误
        that.showError('达到最大压缩次数，但未获得满意结果');
      }
      that.resetCompressButton();
      return;
    }
    
    // 重新压缩
    const query = wx.createSelectorQuery();
    query.select('#compress-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 绘制图片到canvas
        const image = canvas.createImage();
        image.src = that.data.originalImage;
        image.onload = () => {
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

          // 将canvas内容转换为图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            fileType: outputExtension,
            quality: newQuality,
            success(res) {
              // 保存当前压缩结果
              that.setData({
                lastCompressedResult: {
                  path: res.tempFilePath,
                  width: targetWidth,
                  height: targetHeight
                }
              });
              
              // 检查大小是否符合要求
              wx.getFileSystemManager().getFileInfo({
                filePath: res.tempFilePath,
                success(fileInfo) {
                  const newSize = fileInfo.size;
                  // 如果仍然不符合要求，继续调整
                  if (Math.abs(newSize - targetSize) / targetSize > 0.03) {
                    // 继续调整质量
                    let adjustedQuality = newQuality;
                    if (newSize > targetSize) {
                      // 过大，降低质量
                      adjustedQuality = Math.max(0.01, newQuality * 0.9);
                    } else {
                      // 过小，提高质量
                      adjustedQuality = Math.min(1.0, newQuality * 1.1);
                    }
                    that.adjustQualityAndCompressByCanvas(targetSize, adjustedQuality, targetWidth, targetHeight, outputExtension);
                  } else {
                    // 清除计时器并显示结果
                    clearTimeout(that.data.compressionTimer);
                    that.showCompressionResult(res.tempFilePath, targetWidth, targetHeight);
                  }
                },
                fail(err) {
                  console.error('获取文件信息失败:', err);
                  // 不立即显示错误，等待计时器或其他压缩方法
                }
              });
            },
            fail(err) {
              console.error('canvas转换为图片失败:', err);
              // 不立即显示错误，等待计时器或其他压缩方法
            }
          });
        };
      });
  },

  // 显示压缩结果
  showCompressionResult(compressedPath, width, height) {
    const that = this;

    // 清除计时器
    if (that.data.compressionTimer) {
      clearTimeout(that.data.compressionTimer);
      that.setData({
        compressionTimer: null
      });
    }

    // 获取压缩后的图片信息
    wx.getFileSystemManager().getFileInfo({
      filePath: compressedPath,
      success(fileInfo) {
        // 从路径中提取实际的文件扩展名
        const actualExtension = compressedPath.split('.').pop().toLowerCase();
        
        that.setData({
          compressedImage: compressedPath,
          compressedImageInfo: `尺寸: ${width} x ${height} | 大小: ${that.formatFileSize(fileInfo.size)}`,
          actualOutputExtension: actualExtension, // 保存实际的输出扩展名
          showPreview: true,
          lastCompressedResult: null // 清除最后一次压缩结果
        });
        that.resetCompressButton();
      },
      fail(err) {
        console.error('获取压缩图片信息失败:', err);
        that.showError('压缩失败，请重试');
        that.resetCompressButton();
      }
    });
  },

  // 重置压缩按钮
  resetCompressButton() {
    // 清除计时器
    if (this.data.compressionTimer) {
      clearTimeout(this.data.compressionTimer);
    }
    
    this.setData({
      isCompressing: false,
      isProcessing: false,
      disableSettings: false,
      compressionTimer: null
    });
  },

  // 下载图片
  downloadImage() {
    const that = this;
    let filePath = this.data.compressedImage;
    saveImage();   
    // 保存图片到相册的函数
    function saveImage() {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success() {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          // 保存后重置部分状态
          setTimeout(() => {
            that.setData({
              compressedImage: '',
              compressedImageInfo: ''
            });
          }, 1000);
        },
        fail(err) {
          console.error('保存图片失败:', err);
          if (err.errMsg.indexOf('auth deny') !== -1) {
            that.showError('请授权保存图片到相册');
          } else {
            that.showError('保存图片失败，请重试');
          }
        }
      });
    }
  },

  // 重置应用
  resetApp() {
    this.setData({
      showUpload: true,
      showSettings: false,
      showPreview: false,
      errorMessage: '',
      originalImage: '',
      compressedImage: '',
      originalImageInfo: '',
      compressedImageInfo: ''
    });
    this.resetToDefaultSettings();
  },

  // 重置所有参数到默认值
  resetToDefaultSettings() {
    this.setData({
      quality: 80,
      targetSize: '',
      outputFormatIndex: 0,
      resizeOptionIndex: 0,
      showCustomSize: false,
      showPercentageSize: false,
      width: 800,
      height: 600,
      maintainRatio: true,
      scalePercentage: 50,
      isCompressing: false,
      disableSettings: false,
      showSettings: true
    });
    console.log("resetToDefaultSettings");
  },

  // 显示错误信息
  showError(message) {
    this.setData({
      errorMessage: message
    });
    // 3秒后自动隐藏错误信息
    setTimeout(() => {
      this.setData({
        errorMessage: ''
      });
    }, 3000);
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    if (bytes < 1024) {
      return bytes + ' ' + units[0];
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' ' + units[1];
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' ' + units[2];
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' ' + units[3];
    }
  }
});
