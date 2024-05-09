module.exports = {
    extends: ["@pixi/eslint-config"],
    parserOptions: {
        project: "./tsconfig.eslint.json",
        ecmaVersion: 2020,
        sourceType: "module",
    },
    rules: {
        "spaced-comment": [1, "always", { markers: ["/"] }],
        "@typescript-eslint/triple-slash-reference": [1, { path: "always" }],
        "@typescript-eslint/consistent-type-imports": [
            1,
            { disallowTypeAnnotations: false },
        ],
        "@typescript-eslint/type-annotation-spacing": 1,
        "@typescript-eslint/no-non-null-assertion": 0,
    },
    overrides: [
        {
            files: ["*.tests.ts", "*.test.ts"],
            rules: {
                "@typescript-eslint/no-unused-expressions": 0,
                "@typescript-eslint/dot-notation": [
                    0,
                    {
                        allowPrivateClassPropertyAccess: true,
                        allowProtectedClassPropertyAccess: true,
                        allowIndexSignaturePropertyAccess: true,
                    },
                ],
                "dot-notation": 0,
            },
        },
    ],
};
