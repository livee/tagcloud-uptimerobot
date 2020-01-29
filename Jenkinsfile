#!groovy
@Library('jenkins-shared-libraries')

def kubernetes = new com.livee.Kubernetes()
def slack = new com.livee.Slack()

pipeline {
  agent none
  environment {
    CI = 'true'
    APP = 'tagcloud' // The name of the app (eva-app, moderation, etc ...)
    SERVICE_NAME = 'uptimerobot' // The name of the service (api, stats, etc ..)
    GOOGLE_PROJECT = credentials('GKE_GOOGLE_PROJECT')
    CLUSTER_NAME = credentials('GKE_CLUSTER_NAME')
    CLUSTER_REGION = credentials('GKE_CLUSTER_REGION')
  }
  stages {

    stage('Docker image') {
      agent { docker 'docker' }
      when {
        // If it's a pull request or if it's master:
        expression {
          return changeRequest() || env.BRANCH_NAME == 'master'
        }
      }
      steps {
        echo 'Building and pushing the docker image'
        script {
          build_number = kubernetes.getContainerTag()
          withCredentials([file(credentialsId: 'github-private-file', variable: 'PRIVATE_KEY_FILE')]) {
            image = docker.build("${env.GOOGLE_PROJECT}/${env.APP}-${env.SERVICE_NAME}", "--build-arg SSH_PRIVATE_KEY=\"\$(cat ${PRIVATE_KEY_FILE})\" .")
          }
          docker.withRegistry('https://eu.gcr.io', 'gcr:gcr-credentials') {
            image.push(build_number)
            if(env.BRANCH_NAME == 'master') {
              // Push the latest tag on GCR
              image.push('latest')
            }
          }
        }
      }
    }

    stage('Deploy: Staging') {
      environment {
        AMQP_PASSWORD = credentials('RABBITMQ_STAGING_PASSWORD') 
        REDIS_PASSWORD = credentials('REDIS_STAGING_PASSWORD')
        POSTGRES_PASSWORD = credentials('POSTGRES_STAGING_PASSWORD')
        AMQP_HOST = 'rabbit-staging.queue-staging'
      }
      agent { docker 'buildpack-deps:jessie-scm' }
      when {
        expression {
          return changeRequest() || env.BRANCH_NAME == 'master'
        }
      }
      steps {
        echo 'Deploying to Staging'
        script {
          withCredentials([file(credentialsId: 'k8s-credentials', variable: 'AUTH_FILE')]) {
            kubernetes.connectToCluster(AUTH_FILE, CLUSTER_NAME, CLUSTER_REGION, GOOGLE_PROJECT)
          }
          kubernetes.helmDeploy(
                  name          : "${env.APP}-${env.SERVICE_NAME}",
                  namespace     : "${APP}-staging",
                  chart_dir     : "charts/${env.SERVICE_NAME}",
                  set           : [
                          "image.tag": build_number,
                          "image.repository": "eu.gcr.io/${env.GOOGLE_PROJECT}/${env.APP}-${env.SERVICE_NAME}",
                          "env.POSTGRES_CONNECTIONSTRING": "postgres://livee:${env.POSTGRES_PASSWORD}@postgres.db-staging:5432/tagcloud",
                          "env.REDIS_CONNECTIONSTRING": "redis://:${env.REDIS_PASSWORD}@redis-staging-redis-ha-master-svc.db-staging/0",
                          "env.AMQP_CONNECTIONSTRING": "amqp://livee:${env.AMQP_PASSWORD}@${AMQP_HOST}:5672/tagcloud",
                          "env.AMQP_CHECK_STRING": "livee:${env.AMQP_PASSWORD} http://${AMQP_HOST}:15672/api/aliveness-test/tagcloud"
                  ]
          )
        }
      }
    }
    stage('Deploy: Production') {
      environment {
        AMQP_PASSWORD = credentials('RABBITMQ_PRODUCTION_PASSWORD') 
        REDIS_PASSWORD = credentials('REDIS_PRODUCTION_PASSWORD')
        PG_USERNAME = credentials('POSTGRES_PRODUCTION_USERNAME')
        PG_PASSWORD = credentials('POSTGRES_PRODUCTION_PASSWORD')
        AMQP_HOST = 'rabbitmq.queue-production'
      }
      agent { docker 'buildpack-deps:jessie-scm' }
      when {
        branch 'do-not-build-master'
      }
      steps {
        echo 'Deploying to Production'
        script {
          withCredentials([file(credentialsId: 'k8s-credentials', variable: 'AUTH_FILE')]) {
            kubernetes.connectToCluster(AUTH_FILE, CLUSTER_NAME, CLUSTER_REGION, GOOGLE_PROJECT)
          }
          kubernetes.helmDeploy(
                  name          : "${env.APP}-${env.SERVICE_NAME}",
                  namespace     : "${APP}-production",
                  chart_dir     : "charts/${env.SERVICE_NAME}",
                  set           : [
                          "image.tag": build_number,
                          "image.repository": "eu.gcr.io/${env.GOOGLE_PROJECT}/${env.APP}-${env.SERVICE_NAME}",
                          "ingress.host": "tagcloud.livee.com",
                          "env.AMQP_CONNECTIONSTRING": "amqp://livee:${env.AMQP_PASSWORD}@${AMQP_HOST}:5672/tagcloud",
                          "env.POSTGRES_CONNECTIONSTRING": "postgres://${env.PG_USERNAME}:${env.PG_PASSWORD}@pg-sqlproxy-gcloud-sqlproxy.sqlproxy:5432/tagcloud",
                          "env.REDIS_CONNECTIONSTRING": "redis://:${env.REDIS_PASSWORD}@redis-production-redis-ha-master-svc.db-production/0",
                          "env.AMQP_CHECK_STRING": "livee:${env.AMQP_PASSWORD} http://${AMQP_HOST}:15672/api/aliveness-test/tagcloud",
                          "resources.limits.cpu": "500m",
                          "resources.limits.memory": "256Mi"
                          // "resources.requests.cpu": "250m",
                          // "resources.requests.memory": "128Mi"
                  ]
          )
        }
      }
    }
  }
  post {
    always {
      script {
        slack.sendNotifications currentBuild.result
      }
    }
  }
}
