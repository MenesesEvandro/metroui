@ECHO = OFF
cls

cp docs/js/metro/*.* js
cp docs/css/metro-*.css css

cd compress
node compress.js

cd ..
cp min/metro.min.js docs/js

git add .
git commit -am %1

