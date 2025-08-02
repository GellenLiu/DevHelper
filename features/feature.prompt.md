## feature代码生成的注意事项：
1. html、css、js分离，编写在独立的文件中，使用引入的方式使用
2. features里引用的文件路径，都使用/features/开头引用，不使用相对路径，否则会导致在popup中路径指向错误
3. 每个独立的feature都有一个manifest.json文件, 文件内容参考 /features/js-error-monitor/manifest.json

