module.exports = function (grunt) {

    grunt.initConfig({
        ts: {
            prod: {
                tsconfig: './tsconfig.json'
            },
            dev: {
                tsconfig: './tsconfig.json',
                watch: 'src/'
            }
        },
        copy: {
            static: {
                files: [
                    { expand: true, src: ['**'], cwd: 'src/static/', dest: 'dist/ff/' },
                ],
            },
            chromeOpera: {
                files: [
                    { expand: true, src: ['**'], cwd: 'dist/ff/', dest: 'dist/chrome-opera/' },
                ]
            }
        },
        clean: {
            all: {
                src: ['dist', 'zip']
            }
        },
        watch: {
            static: {
                files: 'src/static/**/*',
                tasks: ['copy:static']
            },
            ts: {
                files: 'dist/ff/**/*',
                tasks: ['copy:chromeOpera', 'fix-chromeOpera']
            }
        },
        concurrent: {
            dev: {
                tasks: ['ts:dev', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        compress: {
            ff: {
                options: {
                    archive: 'dist/zip/firefox.zip'
                },
                files: [
                    { src: ['**/*'], dest: '/', cwd: 'dist/ff/', expand: true },
                ]
            },
            chromeOpera: {
                options: {
                    archive: 'dist/zip/chromeOpera.zip'
                },
                files: [
                    { src: ['**/*'], dest: '/', cwd: 'dist/chrome-opera/', expand: true },
                ]
            },
        }
    });
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.registerTask("build", ["clean", "ts:prod", "copy", "fix-chrome-opera", "compress"]);
    grunt.registerTask("default", ['clean', 'copy', 'concurrent']);

    grunt.registerTask('fix-chrome-opera', "Fix the manifest for Chrome and Opera", function () {
        let manifest = grunt.file.readJSON("dist/chrome-opera/manifest.json");

        // fix manifest
        delete manifest.applications;
        manifest.permissions = manifest.permissions.filter(p => p != "tabs");

        grunt.file.write("dist/chrome-opera/manifest.json", JSON.stringify(manifest, null, 2));
    });
};
