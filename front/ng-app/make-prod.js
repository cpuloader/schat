const fs = require('fs');
var glob = require('glob');

const prodJsPath = '../../backend/static/main/';//'./final-prod/js/';
const prodCssPath = '../../backend/static/css/';//'./final-prod/css/';
const prodHtmlPath = '../../backend/templates/'; //'./final-prod/html/';

const distPath = './dist/ng-app/';


console.log('Deleting old files...');
var oldJsFiles = glob.sync(prodJsPath + '*.*');
for (let file of oldJsFiles) {
  fs.unlinkSync(file);
}
var oldHtmlFiles = glob.sync(prodHtmlPath + '*.*');
for (let file of oldHtmlFiles) {
  fs.unlinkSync(file);
}
var oldCssFiles = glob.sync(prodCssPath + '*.*');
for (let file of oldCssFiles) {
  fs.unlinkSync(file);
}

console.log('Collect and copy generated files:');
var main_es5 = glob.sync(distPath + 'main-es5\.+([a-z0-9]).js')[0];
main_es5 = main_es5.slice(distPath.length, main_es5.length);
fs.copyFileSync(distPath + main_es5, prodJsPath + main_es5);
console.log('main_es5', main_es5);

var main_es2015 = glob.sync(distPath + 'main-es2015\.+([a-z0-9]).js')[0];
main_es2015 = main_es2015.slice(distPath.length, main_es2015.length);
fs.copyFileSync(distPath + main_es2015, prodJsPath + main_es2015);
console.log('main_es2015', main_es2015);

var runtime_es5 = glob.sync(distPath + 'runtime-es5\.+([a-z0-9]).js')[0];
runtime_es5 = runtime_es5.slice(distPath.length, runtime_es5.length);
fs.copyFileSync(distPath + runtime_es5, prodJsPath + runtime_es5);
console.log('runtime_es5', runtime_es5);

var runtime_es2015 = glob.sync(distPath + 'runtime-es2015\.+([a-z0-9]).js')[0];
runtime_es2015 = runtime_es2015.slice(distPath.length, runtime_es2015.length);
fs.copyFileSync(distPath + runtime_es2015, prodJsPath + runtime_es2015);
console.log('runtime_es2015', runtime_es2015);

var polyfills_es5 = glob.sync(distPath + 'polyfills-es5\.+([a-z0-9]).js')[0];
polyfills_es5 = polyfills_es5.slice(distPath.length, polyfills_es5.length);
fs.copyFileSync(distPath + polyfills_es5, prodJsPath + polyfills_es5);
console.log('polyfills_es5', polyfills_es5);

var polyfills_es2015 = glob.sync(distPath + 'polyfills-es2015\.+([a-z0-9]).js')[0];
polyfills_es2015 = polyfills_es2015.slice(distPath.length, polyfills_es2015.length);
fs.copyFileSync(distPath + polyfills_es2015, prodJsPath + polyfills_es2015);
console.log('polyfills_es2015', polyfills_es2015);

var styles = glob.sync(distPath + 'styles\.+([a-z0-9]).css')[0];
styles = styles.slice(distPath.length, styles.length);
fs.copyFileSync(distPath + styles, prodCssPath + styles);
console.log('styles', styles);

console.log('Load template index.html...');
var sourceIndexHtml = fs.readFileSync('./source-templates/prod/index.html', { encoding: 'utf-8' });

console.log('Make new index.html...');
sourceIndexHtml = sourceIndexHtml.replace(/main-es5\.[a-z0-9]+\.js/g, main_es5);
sourceIndexHtml = sourceIndexHtml.replace(/main-es2015\.[a-z0-9]+\.js/g, main_es2015);
sourceIndexHtml = sourceIndexHtml.replace(/runtime-es5\.[a-z0-9]+\.js/g, runtime_es5);
sourceIndexHtml = sourceIndexHtml.replace(/runtime-es2015\.[a-z0-9]+\.js/g, runtime_es2015);
sourceIndexHtml = sourceIndexHtml.replace(/polyfills-es5\.[a-z0-9]+\.js/g, polyfills_es5);
sourceIndexHtml = sourceIndexHtml.replace(/polyfills-es2015\.[a-z0-9]+\.js/g, polyfills_es2015);
sourceIndexHtml = sourceIndexHtml.replace(/styles\.[a-z0-9]+\.css/g, styles);
fs.writeFileSync(prodHtmlPath + 'index.html', sourceIndexHtml, { encoding: 'utf-8' });

console.log('Search for lazy modules...');
var lazyFiles = glob.sync(distPath + '+([0-9])-es+([0-9])\.+([a-z0-9])\.js');
for (let lfile of lazyFiles) {
  lfile = lfile.slice(distPath.length, lfile.length);
  fs.copyFileSync(distPath + lfile, prodJsPath + lfile);
  console.log('Copy lazy to prod: ', lfile);
}
console.log('Finished!');