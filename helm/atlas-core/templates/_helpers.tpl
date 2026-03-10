{{/*
ATLAS Core API - Template Helpers
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "atlas-core.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "atlas-core.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version for chart label.
*/}}
{{- define "atlas-core.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "atlas-core.labels" -}}
helm.sh/chart: {{ include "atlas-core.chart" . }}
{{ include "atlas-core.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: atlas-core
{{- end }}

{{/*
Selector labels
*/}}
{{- define "atlas-core.selectorLabels" -}}
app.kubernetes.io/name: {{ include "atlas-core.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service-specific labels
*/}}
{{- define "atlas-core.serviceLabels" -}}
{{ include "atlas-core.labels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Image reference helper
*/}}
{{- define "atlas-core.image" -}}
{{- $registry := .global.registry -}}
{{- $prefix := .global.imagePrefix -}}
{{- $repo := .service.image.repository -}}
{{- $tag := default .global.imageTag .service.image.tag -}}
{{- printf "%s/%s/%s:%s" $registry $prefix $repo $tag -}}
{{- end }}

{{/*
Database URL
*/}}
{{- define "atlas-core.databaseUrl" -}}
{{- if .Values.postgresql.enabled -}}
postgresql://{{ .Values.postgresql.auth.username }}:{{ .Values.postgresql.auth.password }}@{{ include "atlas-core.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}
{{- else -}}
postgresql://$(DB_USER):$(DB_PASSWORD)@{{ .Values.externalPostgresql.host }}:{{ .Values.externalPostgresql.port }}/{{ .Values.externalPostgresql.database }}?sslmode=require
{{- end -}}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "atlas-core.redisUrl" -}}
{{- if .Values.redis.enabled -}}
redis://{{ include "atlas-core.fullname" . }}-redis-master:6379/0
{{- else -}}
redis://{{ .Values.externalRedis.host }}:{{ .Values.externalRedis.port }}/0
{{- end -}}
{{- end }}

{{/*
Kafka brokers
*/}}
{{- define "atlas-core.kafkaBrokers" -}}
{{- if .Values.kafka.enabled -}}
{{ include "atlas-core.fullname" . }}-kafka:9092
{{- else -}}
{{ .Values.externalKafka.brokers }}
{{- end -}}
{{- end }}
