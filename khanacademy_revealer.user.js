// ==UserScript==
// @name         Khan Answers
// @version      1.8
// @description  ur welcome cheater
// @author       Alex Dubov (github@adubov1) / zgredinzyyy (github@zgredinzyyy)
// @match        https://pl.khanacademy.org/*
// @match        https://www.khanacademy.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    window.loaded = false;
    window.khan_debug = {
        enable: false,
        latex: true,
        graph: true,
        fetch_data: true,
        answer: true,
        json: true,
        prevent_printing: false
    }
    class Answer {
        constructor(answer, type) {
            this.body = answer;
            this.type = type;
        }

        get isMultiChoice() {
            return this.type == "multiple_choice";
        }

        get isFreeResponse() {
            return this.type == "free_response";
        }

        get isExpression() {
            return this.type == "expression";
        }

        get isDropdown() {
            return this.type == "dropdown";
        }

        log() {
            const answer = this.body;
            if (window.khan_debug.enable && window.khan_debug.answer) {console.group("Answer Body:"); console.log(answer); console.groupEnd();};
            const style = "color: coral; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";
            const consoleCode = "background: #EEEEF6;" +
                        "border: 1px solid #B2B0C1;" +
                        "border-radius: 7px;" +
                        "padding: 2px 8px 3px;" +
                        "color: #5F5F5F;" +
                        "line-height: 22px;" +
                        "box-shadow: 0px 0px 1px 1px rgba(178,176,193,0.3)";

            answer.map(ans => {
                if (typeof ans == "string") {
                    if (ans.includes("web+graphie")) {
                        this.body[this.body.indexOf(ans)] = "";
                        this.printImage(ans);
                    } else {
                        answer[answer.indexOf(ans)] = ans.replaceAll("$", "");
                    }
                }
            });

            if (window.khan_debug.enable && window.khan_debug.prevent_printing) return;
            let text = (String.raw`${answer.join("\n")}`);
            if (text.includes("\\") || !isLetter(text[0])) {
               this.printLatex(text.trim());
               return
            }
            if (text) {
                console.log(`%c${text.trim()} `, consoleCode);
            }
            else {
                console.log(`%cNone of the above. `, consoleCode);
            }
        }

        printImage(ans) {
            const url = ans.replace("![](web+graphie", "https").replace(")", ".svg");
            if (window.khan_debug.enable && window.khan_debug.graph) {console.group("Graph URL:"); console.log(url); console.groupEnd();};
            var image = new Image();

            image.onload = function() {
              var style = [
                'font-size: 1px;',
                'line-height: ' + this.height % 2 + 'px;',
                'padding: ' + this.height * .5 + 'px ' + this.width * .5 + 'px;',
                'background-size: ' + this.width + 'px ' + this.height + 'px;',
                'background: url('+ url +') no-repeat;'
               ].join(' ');

               console.log('%c ', style);
            };

            image.src = url;
        }

        printLatex(url) {
            const mathurl = "https://math.now.sh?from=" + urlencode(String.raw`${url}`);
            if (window.khan_debug.enable && window.khan_debug.latex) {console.group("LATEX URL:"); console.log(mathurl); console.groupEnd();};;
            var image = new Image();

            image.onload = function() {
              var style = [
                'font-size: 1px;',
                'line-height: ' + this.height % 2 + 'px;',
                'padding: ' + this.height * .5 + 'px ' + this.width * .5 + 'px;',
                'margin: ' + this.height * .1 + 'px ' + this.width * .1 + 'px;',
                'background-size: ' + this.width + 'px ' + this.height + 'px;',
                'background: url('+ mathurl +') no-repeat;',
               ].join(' ');

               console.log('%c ', style);
            };

            image.src = mathurl;
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then((res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                clone.json().then(json => {
                    let item, question;

                    try {
                        item = json.data.assessmentItem.item.itemData;
                        if (window.khan_debug.enable && window.khan_debug.json) {console.group("JSON Response:"); console.log(JSON.parse(item)); console.groupEnd();};
                        question = JSON.parse(item).question;
                    } catch {
                        let errorIteration = () => { return localStorage.getItem("error_iter") || 0; }
                        localStorage.setItem("error_iter", errorIteration() + 1);

                        if (errorIteration() < 4) {
                            return location.reload();
                        } else {
                            return console.log("%c An error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                        }
                    }

                    if (!question) return;

                    Object.keys(question.widgets).map(widgetName => {
                        switch (widgetName.split(" ")[0]) {
                            case "numeric-input":
                                return freeResponseAnswerFrom(question).log();
                            case "radio":
                                return multipleChoiceAnswerFrom(question).log();
                            case "expression":
                                return expressionAnswerFrom(question).log();
                            case "dropdown":
                                return dropdownAnswerFrom(question).log();
                        }
                    });
                });
            }

            if (!window.loaded) {
                console.clear();
                console.log("%c Khan Answers ", "color: #e74c3c; -webkit-text-stroke: .5px black; font-size:40px; font-weight:bolder; padding: .2rem;");
                console.log("%cOriginally created by Alex Dubov (@adubov1)", "color: white; font-size:15px;");
                console.log("%cContinued by @zgredinzyyy", "color: white; font-size:15px;");
                window.loaded = true;
            }

            return res;
        })
    }

    function freeResponseAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answers) {
                return widget.options.answers.map(answer => {
                    if (answer.status == "correct") {
                        return answer.value;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "free_response");
    }

    function multipleChoiceAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat().filter((val) => { return val !== undefined; });

        return new Answer(answer, "multiple_choice");
    }

    function expressionAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.answerForms) {
                return widget.options.answerForms.map(answer => {
                    if (Object.values(answer).includes("correct")) {
                        return answer.value;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "expression");
    }

    function dropdownAnswerFrom(question) {
        const answer = Object.values(question.widgets).map((widget) => {
            if (widget.options?.choices) {
                return widget.options.choices.map(choice => {
                    if (choice.correct) {
                        return choice.content;
                    }
                });
            }
        }).flat();

        return new Answer(answer, "dropdown");
    }

    function urlencode(str) {
        str = (str + '').toString();

        return encodeURIComponent(str)
            .replaceAll('!', '%21')
            .replaceAll('\'', '%5C')
            .replaceAll('(', '%28')
            .replaceAll(')', '%29')
            .replaceAll('*', '%2A')
            .replaceAll('+', '%5C;')
            .replaceAll('%20', '%5C;'); // Adds LaTeX spacing
    }

    function isLetter(c) {
        return c.toLowerCase() != c.toUpperCase();
    }
})();
