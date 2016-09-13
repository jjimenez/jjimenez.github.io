module.exports = function(grunt){
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.initConfig({
    wiredep: {
      target: {
        src: './*.html'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        '*.js',
        'javascript/**/*.js',
        '!javascript/libs/**/*.js',
        '!javascript/archive/**/*.js'
      ]
    }
  });
};
