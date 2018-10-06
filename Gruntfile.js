module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            background: {
                tsconfig: "./tsconfig/background.json"
            },
            content: {
                tsconfig: "./tsconfig/content.json"
            },
            injected: {
                tsconfig: "./tsconfig/injected.json"
            },
            opt: {
                tsconfig: "./tsconfig/options.json"
            }
        },
        copy: {
            static: {
                files: [
                    { expand: true, src: ["**"], cwd: "src/static/", dest: "dist/ff/" },
                ],
            },
            chromeOpera: {
                files: [
                    { expand: true, src: ["**"], cwd: "dist/ff/", dest: "dist/chrome-opera/" },
                ]
            }
        },
        clean: {
            all: {
                src: ["dist", "zip"]
            }
        },
        watch: {
            ts: {
                files: "src/**/*.ts",
                tasks: ["tslint:dev", "ts", "fill-content-script", "copy:chromeOpera", "fix-chrome-opera"]
            },
            static: {
                files: "src/static/**/*",
                tasks: ["copy:static", "fix-chrome-opera"]
            }
        },
        compress: {
            ff: {
                options: {
                    archive: "dist/zip/firefox.zip"
                },
                files: [
                    { src: ["**/*"], dest: "/", cwd: "dist/ff/", expand: true },
                ]
            },
            chromeOpera: {
                options: {
                    archive: "dist/zip/chromeOpera.zip"
                },
                files: [
                    { src: ["**/*"], dest: "/", cwd: "dist/chrome-opera/", expand: true },
                ]
            },
        },
        tslint: {
            dev: {
                files: {
                    src: "src/**/*.ts"
                }
            },
            prod: {
                options: {
                    configuration: "tslint.prod.json"
                },
                files: {
                    src: "src/**/*.ts"
                }
            }
        },
    });
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-tslint");

    grunt.registerTask("build", ["generate-tslint-prod", "tslint:prod", "clean", "ts", "fill-content-script", "copy", "fix-chrome-opera", "compress"]);
    grunt.registerTask("default", ["clean", "tslint:dev", "ts", "fill-content-script", "copy", "fix-chrome-opera", "watch"]);

    grunt.registerTask("generate-tslint-prod", "Generate the tslint file for prod", function () {
        let tslint = grunt.file.readJSON("tslint.json");

        delete tslint.rules["no-debugger"];
        delete tslint.rules["no-console"];

        grunt.file.write("tslint.prod.json", JSON.stringify(tslint, null, 2));
    });

    grunt.registerTask("fix-chrome-opera", "Fix the manifest for Chrome and Opera", function () {
        let manifest = grunt.file.readJSON("dist/chrome-opera/manifest.json");

        // fix manifest
        delete manifest.applications;
        manifest.permissions = manifest.permissions.filter(p => p != "tabs");

        grunt.file.write("dist/chrome-opera/manifest.json", JSON.stringify(manifest, null, 2));
    });

    grunt.registerTask("fill-content-script", "Adds the injected script data into the content script file", function () {
        let injected = grunt.file.read("dist/ff/injected_script.js");
        let content = grunt.file.read("dist/ff/content_script.js");

        content = content.replace('return "placeholder";', injected);

        grunt.file.write("dist/ff/content_script.js", content);
        grunt.file.delete("dist/ff/injected_script.js");
    })
};
