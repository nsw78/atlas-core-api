FROM grafana/grafana:10.3.1
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
ENV GF_SECURITY_ADMIN_USER=admin
ENV GF_SECURITY_ADMIN_PASSWORD=atlas-admin
ENV GF_USERS_ALLOW_SIGN_UP=false
EXPOSE 3000
