package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * MathHandler — Evaluates basic math expressions spoken by the user (<50ms, zero network).
 * Supports: +, -, *, /, % (modulo), parentheses.
 * Examples: "What's 15 percent of 3400", "Calculate 125 plus 340", "85 divided by 5"
 */
object MathHandler {
    private const val TAG = "JarvisMath"

    fun calculate(context: Context, expression: String): CommandResult {
        return try {
            val sanitized = normalizeExpression(expression)

            if (sanitized.isBlank()) {
                return CommandResult(
                    success = false,
                    spokenReply = "I couldn't parse that math expression.",
                    actionId = "CALCULATE"
                )
            }

            val result = evaluateExpression(sanitized)

            if (result == null) {
                return CommandResult(
                    success = false,
                    spokenReply = "I couldn't calculate that. Could you rephrase it?",
                    actionId = "CALCULATE"
                )
            }

            // Format result: if it's a whole number, don't show decimals
            val formatted = if (result == result.toLong().toDouble()) {
                result.toLong().toString()
            } else {
                String.format("%.2f", result)
            }

            Log.i(TAG, "Calculated '$expression' -> $formatted")

            CommandResult(
                success = true,
                spokenReply = "The answer is $formatted.",
                actionId = "CALCULATE",
                extraData = mapOf("expression" to expression, "result" to formatted)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating expression: $expression", e)
            CommandResult(false, "I couldn't calculate that.", "CALCULATE", e.message)
        }
    }

    /**
     * Convert spoken English/Hinglish math phrases into arithmetic expressions.
     */
    private fun normalizeExpression(input: String): String {
        var expr = input.lowercase().trim()

        // Handle "X percent of Y" -> (X / 100) * Y
        val percentOfMatch = Regex("""(\d+(?:\.\d+)?)\s*(?:percent|%)\s*(?:of)\s*(\d+(?:\.\d+)?)""").find(expr)
        if (percentOfMatch != null) {
            val pct = percentOfMatch.groupValues[1]
            val base = percentOfMatch.groupValues[2]
            return "($pct / 100) * $base"
        }

        // Handle "what is X plus/minus/times/divided by Y"
        expr = expr
            .replace(Regex("""^(?:what(?:'s| is)?|calculate|solve|compute)\s*"""), "")
            .replace(" plus ", " + ")
            .replace(" jama ", " + ")
            .replace(" aur ", " + ")
            .replace(" minus ", " - ")
            .replace(" kam ", " - ")
            .replace(" times ", " * ")
            .replace(" multiplied by ", " * ")
            .replace(" guna ", " * ")
            .replace(" into ", " * ")
            .replace(" divided by ", " / ")
            .replace(" over ", " / ")
            .replace(" bata ", " / ")
            .replace(" mod ", " % ")
            .replace(" power ", " ^ ")
            .replace(" raised to ", " ^ ")
            .replace(" square root of ", " sqrt ")
            .trim()

        // Strip everything except digits, operators, spaces, dots, parens
        return expr.replace(Regex("""[^0-9+\-*/.%^() ]"""), "").trim()
    }

    /**
     * Simple recursive descent expression evaluator.
     * Handles +, -, *, /, parentheses.
     */
    private fun evaluateExpression(expr: String): Double? {
        return try {
            val tokens = tokenize(expr)
            val parser = ExprParser(tokens)
            val result = parser.parseExpression()
            if (parser.hasMore()) null else result // Ensure all tokens consumed
        } catch (e: Exception) {
            Log.w(TAG, "Expression parse error: ${e.message}")
            null
        }
    }

    private fun tokenize(expr: String): List<String> {
        val tokens = mutableListOf<String>()
        var i = 0
        while (i < expr.length) {
            val c = expr[i]
            when {
                c.isWhitespace() -> i++
                c.isDigit() || c == '.' -> {
                    val start = i
                    while (i < expr.length && (expr[i].isDigit() || expr[i] == '.')) i++
                    tokens.add(expr.substring(start, i))
                }
                c in "+-*/%^()" -> {
                    tokens.add(c.toString())
                    i++
                }
                else -> i++ // skip unknown
            }
        }
        return tokens
    }

    private class ExprParser(private val tokens: List<String>) {
        private var pos = 0

        fun hasMore() = pos < tokens.size

        fun parseExpression(): Double {
            var result = parseTerm()
            while (pos < tokens.size && tokens[pos] in listOf("+", "-")) {
                val op = tokens[pos++]
                val right = parseTerm()
                result = if (op == "+") result + right else result - right
            }
            return result
        }

        private fun parseTerm(): Double {
            var result = parseFactor()
            while (pos < tokens.size && tokens[pos] in listOf("*", "/", "%")) {
                val op = tokens[pos++]
                val right = parseFactor()
                result = when (op) {
                    "*" -> result * right
                    "/" -> if (right != 0.0) result / right else Double.NaN
                    "%" -> result % right
                    else -> result
                }
            }
            return result
        }

        private fun parseFactor(): Double {
            var result = parseAtom()
            while (pos < tokens.size && tokens[pos] == "^") {
                pos++
                val right = parseAtom()
                result = Math.pow(result, right)
            }
            return result
        }

        private fun parseAtom(): Double {
            if (pos < tokens.size && tokens[pos] == "(") {
                pos++ // skip '('
                val result = parseExpression()
                if (pos < tokens.size && tokens[pos] == ")") pos++ // skip ')'
                return result
            }

            // Handle unary minus
            if (pos < tokens.size && tokens[pos] == "-") {
                pos++
                return -parseAtom()
            }

            if (pos < tokens.size) {
                return tokens[pos++].toDoubleOrNull() ?: 0.0
            }

            return 0.0
        }
    }
}
